import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'

/* -------------------------------------------------------------------------- */
/* GET /api/availability/cars/[carId]                                         */
/* -------------------------------------------------------------------------- */
export async function GET (
  _req: NextRequest,
  { params }: { params: Promise<{ carId: string }> },  // ← params is a Promise
) {
  const { carId } = await params                       // ← await it!

  if (!carId) {
    return NextResponse.json(
      { message: 'Car ID is required' },
      { status: 400 },
    )
  }

  try {
    // Fetch bookings that block availability
    const bookings = await prisma.booking.findMany({
      where: {
        carId,
        status: {
          notIn: [
            BookingStatus.CANCELLED,
            BookingStatus.PAYMENT_FAILED,
            /* add more “non-blocking” statuses if any */
          ],
        },
      },
      select: { startDate: true, endDate: true },
    })

    // Map to { start, end } for react-datepicker `excludeDateIntervals`
    const intervals = bookings.map(b => ({
      start: new Date(b.startDate),
      end:   new Date(b.endDate),
    }))

    return NextResponse.json(intervals) // 200
  } catch (err) {
    console.error(`Availability lookup failed for car ${carId}:`, err)
    return NextResponse.json(
      { message: `Failed to fetch availability for car ${carId}` },
      { status: 500 },
    )
  }
}
