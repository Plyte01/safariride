import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Option 1: Get distinct categories from existing cars
    const distinctCategories = await prisma.car.groupBy({
      by: ['category'],
      where: {
        isListed: true,
        isVerified: true,
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc', // Optional: order by popularity
        },
      },
    });

    const categories = distinctCategories.map(item => ({
        name: item.category,
        count: item._count.category
    }));

    // Option 2: Return all defined enum values (if you want to show all possible categories regardless of car count)
    // const allCategories = Object.values(CarCategory).map(cat => ({ name: cat, count: 0 }));
    // For a mix, you could fetch distinct and merge counts, or just show all.
    // For simplicity with counts from actual cars, Option 1 is good.

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch car categories:', error);
    return NextResponse.json({ message: 'Failed to fetch car categories' }, { status: 500 });
  }
}