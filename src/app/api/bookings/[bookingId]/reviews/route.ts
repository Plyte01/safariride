import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { BookingStatus } from '@prisma/client'

/* -------------------------------------------------------------------------- */
/* POST /api/bookings/[bookingId]/reviews                                     */
/* -------------------------------------------------------------------------- */
export async function POST (
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },   // ← promise
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { bookingId } = await params                         // ← await it!
  const { rating, comment } = await req.json()

  /* ---------- input validation ---------- */
  if (!bookingId) {
    return NextResponse.json({ message: 'Booking ID is required.' }, { status: 400 })
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json(
      { message: 'Rating must be a number between 1 and 5.' },
      { status: 400 },
    )
  }
  if (comment && typeof comment !== 'string') {
    return NextResponse.json({ message: 'Comment must be a string.' }, { status: 400 })
  }

  try {
    /* ---------- fetch booking ---------- */
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        carId: true,
        status: true,
        review: { select: { id: true } },
      },
    })
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 })
    }

    /* ---------- auth & eligibility ---------- */
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Forbidden: You can only review your own bookings.' },
        { status: 403 },
      )
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      return NextResponse.json(
        { message: 'You can only review completed bookings.' },
        { status: 400 },
      )
    }
    if (booking.review) {
      return NextResponse.json(
        { message: 'A review has already been submitted for this booking.' },
        { status: 409 },
      )
    }

    /* ---------- create review in a transaction ---------- */
    const newReview = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          rating,
          comment: comment || null,
          userId: session.user.id,
          carId: booking.carId,
          bookingId: booking.id,
        },
      })

      const ratings = await tx.review.findMany({
        where: { carId: booking.carId },
        select: { rating: true },
      })
      const total = ratings.length
      const avg = total ? +(ratings.reduce((a, r) => a + r.rating, 0) / total).toFixed(1) : 0

      await tx.car.update({
        where: { id: booking.carId },
        data: { averageRating: avg, totalRatings: total },
      })

      /* notify car owner */
      const owner = await tx.car.findUnique({
        where: { id: booking.carId },
        select: { ownerId: true },
      })
      if (owner?.ownerId && owner.ownerId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: owner.ownerId,
            type: 'NEW_REVIEW',
            title: 'New review for your car',
            message: `${session.user.name ?? 'A user'} left a ${rating}-star review.`,
          },
        })
      }

      return created
    })

    return NextResponse.json(newReview, { status: 201 })
  } catch (err) {
    console.error(`Failed to create review for booking ${bookingId}:`, err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { message: 'Failed to submit review.', details: msg },
      { status: 500 },
    )
  }
}
