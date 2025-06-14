import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all cars owned by the user
    const cars = await prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const carIds = cars.map(car => car.id);

    // Get recent bookings with user details
    const bookings = await prisma.booking.findMany({
      where: {
        carId: { in: carIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent bookings
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching dashboard bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 