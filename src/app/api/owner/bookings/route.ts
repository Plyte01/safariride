// src/app/api/owner/bookings/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client';

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

export async function GET() {
  console.log("GET /api/owner/bookings - Request received");
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error("GET /api/owner/bookings - Unauthorized: No session or user found.");
    return NextResponse.json({ message: 'Unauthorized: No session or user found.' }, { status: 401 });
  }
  const sessionUser = session.user as SessionUser;
  console.log("GET /api/owner/bookings - Session User ID:", sessionUser.id, "Role:", sessionUser.role);
  const userRole = sessionUser.role;
  if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
    console.error("GET /api/owner/bookings - Forbidden: User role is not OWNER or ADMIN. Role:", userRole);
    return NextResponse.json({ message: 'Forbidden: Access restricted to Car Owners or Admins.' }, { status: 403 });
  }
  console.log("GET /api/owner/bookings - Session User ID:", sessionUser.id, "Role:", sessionUser.role);

    console.log("GET /api/owner/bookings - Fetching cars for ownerId:", sessionUser.id);
    const ownedCarIdsResult = await prisma.car.findMany({
      where: { ownerId: sessionUser.id },
      select: { id: true },
    });
    const ownedCarIds = ownedCarIdsResult.map(car => car.id);
    console.log("GET /api/owner/bookings - Owned Car IDs:", ownedCarIds);
  try {
    console.log("GET /api/owner/bookings - Fetching cars for ownerId:", session.user.id);
    const ownedCarIdsResult = await prisma.car.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    const ownedCarIds = ownedCarIdsResult.map(car => car.id);
    console.log("GET /api/owner/bookings - Owned Car IDs:", ownedCarIds);

    if (ownedCarIds.length === 0 && userRole === UserRole.OWNER) {
      console.log("GET /api/owner/bookings - Owner has no cars. Returning empty array.");
      return NextResponse.json([], { status: 200 });
    }
    // If admin has no cars, they might still want to see bookings if the logic were different,
    // but for now, this also results in empty if no car IDs.

    if (ownedCarIds.length === 0 && userRole === UserRole.ADMIN) {
        console.log("GET /api/owner/bookings - Admin is the 'owner' here but has no cars under their direct ownership for this query. Returning empty array (or adjust logic if admin should see all).");
        return NextResponse.json([], { status: 200 });
    }


    console.log("GET /api/owner/bookings - Fetching bookings for car IDs:", ownedCarIds);
    const bookings = await prisma.booking.findMany({
      where: {
        carId: {
          in: ownedCarIds, // Pass the array of IDs directly
        },
      },
      include: {
        car: {
          select: { id: true, title: true, make: true, model: true, images: true },
        },
        user: { // The renter
          select: { id: true, name: true, email: true },
        },
        payment: {
          select: { status: true, paymentMethod: true, amount: true, currency: true },
        },
      },
      orderBy: [ // Array for multiple order by conditions
        { status: 'asc' },
        { startDate: 'asc' },
      ],
    });
    console.log("GET /api/owner/bookings - Bookings found:", bookings.length);

    return NextResponse.json(bookings, { status: 200 });

  } catch (error) {
    console.error('GET /api/owner/bookings - Error during database query or processing:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: 'Failed to fetch your car bookings', details: errorMessage, errorFull: JSON.stringify(error, Object.getOwnPropertyNames(error)) }, { status: 500 });
  }
}