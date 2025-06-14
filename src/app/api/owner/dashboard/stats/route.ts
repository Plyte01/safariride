import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Fetching stats for user:', userId);

    // Get all cars owned by the user
    const cars = await prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    console.log('Found cars:', cars);

    const carIds = cars.map(car => car.id);
    if (carIds.length === 0) {
      console.log('No cars found for user');
      return NextResponse.json({
        totalEarnings: 0,
        activeBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        pendingMessages: 0,
        maintenanceAlerts: 0,
      });
    }

    try {
      // Get total earnings (only from completed bookings with completed payments)
      const earnings = await prisma.payment.aggregate({
        where: {
          booking: {
            carId: { in: carIds },
            status: BookingStatus.COMPLETED,
          },
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      });
      console.log('Earnings query result:', earnings);

      // Get active bookings (CONFIRMED, ON_DELIVERY_PENDING)
      const activeBookings = await prisma.booking.count({
        where: {
          carId: { in: carIds },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.ON_DELIVERY_PENDING] },
        },
      });
      console.log('Active bookings count:', activeBookings);

      // Get average rating and total reviews
      const reviews = await prisma.review.aggregate({
        where: {
          carId: { in: carIds },
        },
        _avg: {
          averageRating: true,
        },
        _count: true,
      });
      console.log('Reviews query result:', reviews);

      // Get unread messages (messages in threads where the owner is a participant)
      const pendingMessages = await prisma.message.count({
        where: {
          thread: {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
          senderId: {
            not: userId, // Only count messages from others
          },
          createdAt: {
            gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });
      console.log('Pending messages count:', pendingMessages);

      // Get maintenance alerts (cars that haven't been maintained in the last 90 days)
      const maintenanceAlerts = await prisma.car.count({
        where: {
          id: { in: carIds },
          updatedAt: {
            lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          },
        },
      });
      console.log('Maintenance alerts count:', maintenanceAlerts);

      const response = {
        totalEarnings: earnings._sum?.amount ?? 0,
        activeBookings,
        averageRating: reviews._avg?.averageRating ?? 0,
        totalReviews: reviews._count,
        pendingMessages,
        maintenanceAlerts,
      };
      console.log('Final response:', response);

      return NextResponse.json(response);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 