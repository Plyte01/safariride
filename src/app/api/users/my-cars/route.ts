import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path as needed
import { UserRole } from '@prisma/client';

type SessionUser = {
  id: string;
  role: UserRole;
  // add other properties if needed
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  const userRole = (session.user as SessionUser).role;

  // Ensure the user is an OWNER or ADMIN to access this (though it's filtered by ownerId)
  if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: User is not an Owner or Admin' }, { status: 403 });
  }

  try {
    const ownedCars = await prisma.car.findMany({
      where: {
        ownerId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Include any other details you might need on the dashboard
      // include: {
      //   _count: { // Example: count of bookings for each car
      //     select: { bookings: true },
      //   },
      // },
    });

    return NextResponse.json(ownedCars, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch owned cars:', error);
    return NextResponse.json({ message: 'Failed to fetch owned cars' }, { status: 500 });
  }
}