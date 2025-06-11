import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole, BookingStatus, Prisma, PaymentStatus } from '@prisma/client';

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
};

// GET /api/admin/bookings/[bookingId]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        user: { select: { id: true, name: true, email: true, image: true } },
        payment: true,
        review: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch booking ${bookingId} for admin:`, error);
    return NextResponse.json(
      { message: 'Error fetching booking details', details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/bookings/[bookingId]/status
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status, notes, totalPrice } = body;

    const dataToUpdate: Prisma.BookingUpdateInput = {};

    if (status !== undefined && Object.values(BookingStatus).includes(status as BookingStatus)) {
      dataToUpdate.status = status as BookingStatus;

      if (status === BookingStatus.COMPLETED && body.paymentId && body.paymentMethod === 'CASH') {
        dataToUpdate.payment = {
          update: {
            where: { id: body.paymentId },
            data: { status: PaymentStatus.PAID },
          },
        };
      }
    } else if (status !== undefined) {
      return NextResponse.json({ message: 'Invalid booking status provided.' }, { status: 400 });
    }

    if (notes !== undefined) {
      const existingNotes = (await prisma.booking.findUnique({ where: { id: bookingId } }))?.notes || '';
      dataToUpdate.notes = notes === '' ? null : `${existingNotes}\nAdmin Note: ${notes}`;
    }

    if (totalPrice !== undefined && !isNaN(parseFloat(totalPrice))) {
      dataToUpdate.totalPrice = parseFloat(totalPrice);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: dataToUpdate,
      include: {
        car: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
        payment: true,
      },
    });

    // Optional: send notifications here...

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    console.error(`Failed to update booking ${bookingId} by admin:`, error);
    return NextResponse.json(
      { message: `Failed to update booking`, details: String(error) },
      { status: 500 }
    );
  }
}
