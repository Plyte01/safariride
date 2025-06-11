import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { UserRole, BookingStatus, PaymentStatus } from '@prisma/client';

// PATCH /api/owner/bookings/[bookingId]/status - Update booking status by owner
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  interface SessionUser {
    id: string;
    role: UserRole;
    [key: string]: unknown;
  }

  const session = await getServerSession(authOptions);
  const { bookingId } = await params;

  if (!session || !session.user || !('id' in session.user) || !('role' in session.user)) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  const userRole = (session.user as SessionUser).role;
  if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Access restricted.' }, { status: 403 });
  }

  try {
    const { newStatus } = await req.json() as { newStatus: BookingStatus };

    if (!newStatus || !Object.values(BookingStatus).includes(newStatus)) {
      return NextResponse.json({ message: 'Invalid "newStatus" provided.' }, { status: 400 });
    }

    // Fetch the booking to verify ownership (if not admin) and current status
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        car: { select: { ownerId: true } },
        payment: { select: { id: true } }
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    // Authorization: Ensure the user owns the car associated with the booking, or is an Admin
    if (userRole === UserRole.OWNER && booking.car.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You do not own the car for this booking.' }, { status: 403 });
    }

    // Business logic for status transitions (examples)
    let paymentUpdateData = {};
    if (booking.status === BookingStatus.ON_DELIVERY_PENDING && newStatus === BookingStatus.CONFIRMED) {
      // Owner confirms a "Pay on Delivery" booking. Payment status is still pending physical payment.
      // Payment status would be updated separately when cash is received.
      if (booking.payment) { // If a payment record exists
        paymentUpdateData = { payment: { update: { status: PaymentStatus.REFUNDED }}}; // Or a new 'CANCELLED' payment status
      }
    } else if (newStatus === BookingStatus.COMPLETED) {
      // If it was Pay on Delivery and payment was made, owner might also update payment status here or separately
      // This often means the car has been returned and inspected.
    } else if (newStatus === BookingStatus.NO_SHOW) {
        // Handle implications for payment, e.g. charge a no-show fee if applicable
    }
     // Add more specific transition logic as needed


    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        // Potentially update payment status or add notes based on transition
        ...(Object.keys(paymentUpdateData).length > 0 ? paymentUpdateData : {}),
        // notes: booking.notes ? `${booking.notes}\nOwner note: ${reason || ''}` : `Owner note: ${reason || ''}` // Append owner reason if provided
      },
      include: { // Return the updated booking with relevant details
        car: { select: { id: true, title: true, make: true, model: true, images: true } },
        user: { select: { id: true, name: true, email: true } },
        payment: { select: { status: true, paymentMethod: true, amount: true, currency: true } },
      }
    });

    // TODO: Send notifications to the Renter about the status change.

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error: unknown) {
    console.error(`Failed to update status for booking ${bookingId}:`, error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        return NextResponse.json({ message: `Booking with ID ${bookingId} not found.` }, { status: 404 });
    }
    return NextResponse.json({ message: `Failed to update booking status` }, { status: 500 });
  }
}