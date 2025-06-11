import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: {
        car: { // Include car details for display
          select: { make: true, model: true, year: true, imageUrls: true, location: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(bookings, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user's bookings:", error);
    return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 });
  }
}