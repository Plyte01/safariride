import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client'; // Use your enums

const ACTIVITY_LIMIT = 15; // Number of recent activities to fetch overall
const PER_MODEL_FETCH_LIMIT = 10; // How many to fetch from each model initially before combining and sorting

interface ActivityItem {
  id: string; // Unique ID for the activity (can be the ID of the underlying record)
  type: string; // e.g., "New User", "New Car", "Booking Confirmed", "New Review"
  description: string;
  timestamp: Date; // Use Date object for accurate sorting, convert to ISO string in response
  linkUrl?: string; // Optional link to the relevant resource in admin panel
  actorName?: string | null; // Name of the user who performed the action, if applicable
  actorImage?: string | null; // Image of the actor
  targetName?: string | null; // Name/title of the item being acted upon (e.g., car title)
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user as { role?: UserRole }).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const allActivities: ActivityItem[] = [];

    // 1. Fetch Recent User Registrations
    const recentUsers = await prisma.user.findMany({
      take: PER_MODEL_FETCH_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true, role: true, image: true },
    });
    recentUsers.forEach(user => {
      allActivities.push({
        id: `user-${user.id}`,
        type: 'New User',
        description: `${user.name || user.email} registered as ${user.role.toLowerCase()}.`,
        timestamp: user.createdAt,
        linkUrl: `/admin/users/${user.id}/details`, // Link to user detail page
        actorName: user.name,
        actorImage: user.image,
      });
    });

    // 2. Fetch Recent Car Listings
    const recentCars = await prisma.car.findMany({
      take: PER_MODEL_FETCH_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, make: true, model: true, createdAt: true, owner: { select: { name: true, id: true } } },
    });
    recentCars.forEach(car => {
      allActivities.push({
        id: `car-${car.id}`,
        type: 'New Car Listed',
        description: `"${car.title || `${car.make} ${car.model}`}" listed by ${car.owner?.name || 'Unknown Owner'}.`,
        timestamp: car.createdAt,
        linkUrl: `/admin/cars/${car.id}/details`,
        actorName: car.owner?.name,
        targetName: car.title || `${car.make} ${car.model}`,
      });
    });
    
    // 3. Fetch Recent Bookings (Creations or significant status changes)
    // For status changes, you'd typically look at `updatedAt` and the specific status.
    // For simplicity, let's focus on newly created bookings.
    const recentBookings = await prisma.booking.findMany({
      take: PER_MODEL_FETCH_LIMIT,
      orderBy: { createdAt: 'desc' }, // Or updatedAt if tracking status changes as "activity"
      select: { 
        id: true, 
        status: true, 
        createdAt: true, 
        updatedAt: true, // Use if tracking status updates
        user: { select: { name: true, id: true } }, // Renter
        car: { select: { title: true, make: true, model: true, id: true } } 
      },
    });
    recentBookings.forEach(booking => {
      allActivities.push({
        id: `booking-${booking.id}`,
        type: `New Booking (${booking.status})`, // e.g., "New Booking (PENDING)"
        description: `Booking for "${booking.car.title || `${booking.car.make} ${booking.car.model}`}" by ${booking.user.name || 'Unknown Renter'}.`,
        timestamp: booking.createdAt, // Or booking.updatedAt if focusing on last status change
        linkUrl: `/admin/bookings/${booking.id}/details`,
        actorName: booking.user.name,
        targetName: booking.car.title || `${booking.car.make} ${booking.car.model}`,
      });
      // Example: If you also want to capture booking confirmations as separate activities
      // This would require querying for bookings where `updatedAt` is recent AND `status` changed to CONFIRMED.
      // if (booking.status === BookingStatus.CONFIRMED && isRecent(booking.updatedAt)) {
      //   allActivities.push({ /* ... type: 'Booking Confirmed' ... */ });
      // }
    });

    // 4. Fetch Recent Reviews
    const recentReviews = await prisma.review.findMany({
      take: PER_MODEL_FETCH_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        rating: true, 
        comment: true, 
        createdAt: true, 
        user: { select: { name: true, id: true } }, // Reviewer
        car: { select: { title: true, make: true, model: true, id: true } } 
      },
    });
    recentReviews.forEach(review => {
      allActivities.push({
        id: `review-${review.id}`,
        type: 'New Review',
        description: `${review.user.name || 'A user'} left a ${review.rating}-star review for "${review.car.title || `${review.car.make} ${review.car.model}`}".`,
        timestamp: review.createdAt,
        linkUrl: `/admin/cars/${review.car.id}/details#reviews`, // Link to car reviews section
        actorName: review.user.name,
        targetName: review.car.title || `${review.car.make} ${review.car.model}`,
      });
    });

    // --- Combine, Sort, and Limit ---
    const sortedActivities = allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedActivities = sortedActivities.slice(0, ACTIVITY_LIMIT);

    // Convert Date objects to ISO strings for JSON response
    const responseActivities = limitedActivities.map(activity => ({
        ...activity,
        timestamp: activity.timestamp.toISOString(),
    }));

    return NextResponse.json(responseActivities, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch recent activity', details: errorMessage }, { status: 500 });
  }
}