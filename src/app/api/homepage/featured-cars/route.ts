import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const featuredCars = await prisma.car.findMany({
      where: {
        isListed: true,
        isVerified: true, // Or some other criteria for "featured"
      },
      orderBy: [
        // { averageRating: 'desc' }, // Example: prioritize highly rated
        { createdAt: 'desc' },   // Then by newest
      ],
      take: 4, // Limit to a small number for the homepage
      include: {
        owner: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(featuredCars, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch featured cars:', error);
    return NextResponse.json({ message: 'Failed to fetch featured cars' }, { status: 500 });
  }
}