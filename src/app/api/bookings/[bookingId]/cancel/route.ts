import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { BookingStatus, PaymentStatus } from '@prisma/client'

const CANCELLATION_WINDOW_HOURS = 1 // adjust as needed

/* -------------------------------------------------------------------------- */
/* PATCH /api/bookings/[bookingId]/cancel                                     */
/* -------------------------------------------------------------------------- */
export async function PATCH (
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }, // ← promise
) {
  const session = await getServerSession(authOptions)
  const { bookingId } = await params                       // ← await it!

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { message: 'Unauthorized: Not logged in' },
      { status: 401 },
    )
  }

  if (!bookingId) {
    return NextResponse.json(
      { message: 'Booking ID is required.' },
      { status: 400 },
    )
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    })

    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found.' },
        { status: 404 },
      )
    }

    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Forbidden: You can only cancel your own bookings.' },
        { status: 403 },
      )
    }

    /* ---------- eligibility checks ---------- */
    const nonCancellableStatusSet = new Set<BookingStatus>([
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
]);

if (nonCancellableStatusSet.has(booking.status)) {
      return NextResponse.json(
        {
          message: `Booking is already ${booking.status.toLowerCase()} and cannot be cancelled.`,
        },
        { status: 400 },
      )
    }

    const hoursToPickup =
      (+new Date(booking.startDate) - +new Date()) / 36e5
    if (hoursToPickup < CANCELLATION_WINDOW_HOURS) {
      return NextResponse.json(
        {
          message: `Bookings cannot be cancelled within ${CANCELLATION_WINDOW_HOURS} hour(s) of pickup.`,
        },
        { status: 400 },
      )
    }

    /* ---------- refund placeholder ---------- */
    let paymentUpdate: Record<string, unknown> | undefined
    if (booking.payment?.status === PaymentStatus.PAID) {
      console.warn(
        `REFUND TODO: implement refund API for payment ${booking.payment.id}`,
      )
      // paymentUpdate = { status: PaymentStatus.REFUNDED }
    }

    /* ---------- cancel booking ---------- */
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        ...(paymentUpdate && booking.payment
          ? {
              payment: {
                update: { where: { id: booking.payment.id }, data: paymentUpdate },
              },
            }
          : {}),
      },
      include: {
        car: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            images: true,
            location: true,
          },
        },
        payment: {
          select: {
            status: true,
            paymentMethod: true,
            amount: true,
            currency: true,
          },
        },
      },
    })

    /* ---------- notify owner ---------- */
    const carOwner = await prisma.car.findUnique({
      where: { id: booking.carId },
      select: { ownerId: true, title: true, make: true, model: true },
    })
    if (carOwner?.ownerId) {
      await prisma.notification.create({
        data: {
          userId: carOwner.ownerId,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled by Renter',
          message: `Booking ${bookingId.slice(0, 8)}… for your car "${
            carOwner.title || `${carOwner.make} ${carOwner.model}`
          }" has been cancelled by the renter.`,
        },
      })
    }

    return NextResponse.json(updated) // 200
  } catch (err) {
    console.error(`Failed to cancel booking ${bookingId}:`, err)
    return NextResponse.json(
      {
        message: 'Failed to cancel booking',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
}
