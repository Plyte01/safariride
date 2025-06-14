import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { PaymentStatus, UserRole } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { bookingId } = await params;

  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the booking with payment details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        car: {
          select: {
            ownerId: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    // Check if user is authorized (must be admin, owner of the car, or the renter)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAdmin = (session.user as any).role === UserRole.ADMIN;
    const isOwner = booking.car.ownerId === session.user.id;
    const isRenter = booking.userId === session.user.id;

    if (!isAdmin && !isOwner && !isRenter) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Update payment status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        payment: {
          update: {
            status: PaymentStatus.PAID
          }
        }
      },
      include: {
        payment: true,
        car: {
          select: {
            title: true,
            make: true,
            model: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for the owner
    if (isAdmin || isRenter) {
      await prisma.notification.create({
        data: {
          userId: booking.car.ownerId,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment Received',
          message: `Payment for booking ${bookingId.substring(0, 8)}... has been marked as paid.`
        }
      });
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { message: 'Failed to update payment status' },
      { status: 500 }
    );
  }
} 