import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { BookingStatus, PaymentStatus } from '@prisma/client'; // Use your enums

const CANCELLATION_WINDOW_HOURS = 1; // Example: Cannot cancel within 24 hours of pickup

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { bookingId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  try {
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required.' }, { status: 400 });
    }

    // Fetch the booking to verify ownership and eligibility
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true, // Include payment to check status for potential refunds
      }
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    // Authorization: User must be the renter who made the booking
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You can only cancel your own bookings.' }, { status: 403 });
    }

    // Eligibility Checks:
    // 1. Booking must not already be cancelled or completed
    const nonCancellableStatuses: BookingStatus[] = [
      BookingStatus.CANCELLED, // From your schema
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW, // If you have this status
      // Potentially BookingStatus.PAYMENT_FAILED depending on your flow
    ];
    if (nonCancellableStatuses.includes(booking.status)) {
      return NextResponse.json({ message: `Booking is already ${booking.status.toLowerCase()} and cannot be cancelled.` }, { status: 400 });
    }

    // 2. Check cancellation window (e.g., not within 24 hours of pickup)
    const now = new Date();
    const pickupTime = new Date(booking.startDate);
    const hoursToPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursToPickup < CANCELLATION_WINDOW_HOURS) {
      return NextResponse.json({ message: `Bookings cannot be cancelled within ${CANCELLATION_WINDOW_HOURS} hours of pickup.` }, { status: 400 });
    }

    // --- Proceed with Cancellation ---
    const updatedPaymentData: object | undefined = undefined;

    // TODO: Implement Refund Logic if pre-paid
    // This is a placeholder. Actual refund logic depends on your payment gateway and policies.
    if (booking.payment && booking.payment.status === PaymentStatus.PAID) {
      // 1. Call your payment gateway's refund API (e.g., Stripe, Mpesa reversal if possible).
      // 2. If refund is successful, update payment status.
      console.warn(`REFUND TODO: Booking ${bookingId} was PAID. Implement refund logic for payment ID ${booking.payment.id}.`);
      // For now, we'll just mark it as needing a refund or set it to refunded if the logic was here.
      // This might be a manual process for an admin if direct refund API isn't implemented yet.
      // Let's assume for now we don't change payment status automatically without real refund processing
      // updatedPaymentData = { status: PaymentStatus.REFUNDED }; // If refund processed
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED, // Using your 'CANCELLED' status
        // If you had CANCELLED_BY_USER specifically: status: BookingStatus.CANCELLED_BY_USER,
        ...(updatedPaymentData && booking.payment?.id
          ? {
              payment: {
                update: {
                  where: { id: booking.payment.id },
                  data: updatedPaymentData
                }
              }
            }
          : {})
      },
      include: { // Return updated booking with relevant details for UI update
        car: { select: { id: true, title: true, make: true, model: true, images: true, location: true } },
        payment: { select: { status: true, paymentMethod: true, amount: true, currency: true } },
      }
    });

    // TODO: Send notification to the Car Owner about the cancellation.
    const carOwner = await prisma.car.findUnique({
        where: { id: booking.carId },
        select: { ownerId: true }
    });
    if (carOwner?.ownerId) {
        await prisma.notification.create({
            data: {
                userId: carOwner.ownerId,
                type: 'BOOKING_CANCELLED', // From your NotificationType enum
                title: 'Booking Cancelled by Renter',
                message: `Booking ID ${bookingId.substring(0,8)}... for your car "${updatedBooking.car.title || `${updatedBooking.car.make} ${updatedBooking.car.model}`}" has been cancelled by the renter.`
            }
        });
    }

    return NextResponse.json(updatedBooking, { status: 200 });

  } catch (error) {
    console.error(`Failed to cancel booking ${bookingId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to cancel booking', details: errorMessage }, { status: 500 });
  }
}