// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path as necessary
import { UserRole, BookingStatus, PaymentStatus as PrismaPaymentStatus } from '@prisma/client'; // Use PrismaPaymentStatus from your schema

export async function GET() {
  const session = await getServerSession(authOptions);

  interface SessionUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  }

  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate start of the current week (assuming Sunday is the first day)
    const currentDayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0,0,0,0);

    // Define what constitutes an "active" booking for counting purposes
    const activeBookingStatuses: BookingStatus[] = [
        BookingStatus.CONFIRMED,
        BookingStatus.AWAITING_PAYMENT,
        BookingStatus.ON_DELIVERY_PENDING,
        // Add any other statuses from your BookingStatus enum that you consider active
        // BookingStatus.PENDING, // If PENDING means it's an active consideration
    ];

    // Parallelize Prisma queries for better performance
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalCars,
      pendingVerificationCars,
      activeCars, // Cars that are listed, verified, and active based on your Car model's fields
      totalBookings,
      newBookingsToday,
      newBookingsThisWeek,
      newBookingsThisMonth,
      activeBookingsCount,
      completedBookingsCount,
      totalBookingValueResult, // Sum of totalPrice for non-cancelled bookings
      totalPaidRevenueResult,   // Sum of amount for PAID payments
      carRatingStats,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.car.count(),
      prisma.car.count({ where: { isVerified: false } }),
      prisma.car.count({ where: { 
          isListed: true, 
          isVerified: true, 
          isActive: true // Using isActive from your Car schema
      }}),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({
        where: {
          status: { in: activeBookingStatuses },
          // Optional: filter further, e.g., only bookings whose endDate is in the future
          // endDate: { gte: today } 
        },
      }),
      prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { // Sum value of bookings that are not in a failed/cancelled state
            notIn: [BookingStatus.CANCELLED, BookingStatus.PAYMENT_FAILED /*, add others if needed */ ],
          },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PrismaPaymentStatus.PAID, // Using your enum
        },
      }),
      prisma.car.aggregate({ // For platform-wide average rating
        _avg: { averageRating: true }, // Assumes averageRating is up-to-date on Car model
        _sum: { totalRatings: true },  // Total number of ratings submitted
      }),
    ]);

    const totalBookingValue = totalBookingValueResult._sum.totalPrice || 0;
    const totalPaidRevenue = totalPaidRevenueResult._sum.amount || 0;

    // Calculate average booking value based on non-cancelled bookings that have a price
    const relevantBookingsForAvg = await prisma.booking.count({
        where: { 
            totalPrice: { gt: 0 }, // Only consider bookings with a price
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.PAYMENT_FAILED] }
        }
    });
    const averageBookingValue = relevantBookingsForAvg > 0 ? parseFloat((totalBookingValue / relevantBookingsForAvg).toFixed(2)) : 0;
    
    const platformAverageCarRating = carRatingStats._avg.averageRating ? parseFloat(carRatingStats._avg.averageRating.toFixed(1)) : 0;
    const totalPlatformRatingsCount = carRatingStats._sum.totalRatings || 0;


    return NextResponse.json({
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalCars,
      pendingVerificationCars,
      activeCars,
      platformAverageCarRating,
      totalPlatformRatingsCount,
      totalBookings,
      newBookingsToday,
      newBookingsThisWeek,
      newBookingsThisMonth,
      activeBookings: activeBookingsCount, // Renamed from activeBookings to avoid conflict with local var
      completedBookings: completedBookingsCount,
      totalBookingValue, // Total value of potentially bookable/booked items
      totalPaidRevenue,  // Actual revenue confirmed via payments
      averageBookingValue,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch admin dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch dashboard statistics', details: errorMessage }, { status: 500 });
  }
}