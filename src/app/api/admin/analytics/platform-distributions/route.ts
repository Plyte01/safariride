import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const [
      userRolesData,
      carCategoriesData,
      carVerificationStatusData,
      bookingStatusData,
    ] = await prisma.$transaction([
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        orderBy: { role: 'asc'}
      }),
      prisma.car.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { isActive: true, isListed: true }, // Count only active/listed cars for category distribution
        orderBy: { _count: {id: 'desc'}}
      }),
      prisma.car.groupBy({
        by: ['isVerified'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
        orderBy: { _count: {id: 'desc'}}
      }),
    ]);

    const userRolesDistribution = userRolesData.map(item => ({
      name: item.role,
      value: typeof item._count === 'object' && item._count !== null && 'id' in item._count ? (item._count.id ?? 0) : 0
    }));
    const carCategoriesDistribution = carCategoriesData.map(item => ({
      name: item.category,
      value: typeof item._count === 'object' && item._count !== null && 'id' in item._count ? (item._count.id ?? 0) : 0
    }));
    const carVerificationDistribution = carVerificationStatusData.map(item => ({
      name: item.isVerified ? 'Verified' : 'Not Verified',
      value: typeof item._count === 'object' && item._count !== null && 'id' in item._count ? (item._count.id ?? 0) : 0
    }));
    const bookingStatusDistribution = bookingStatusData.map(item => ({
      name: item.status,
      value: item._count && typeof item._count === 'object' && 'id' in item._count ? (item._count.id ?? 0) : 0
    }));

    return NextResponse.json({
      userRolesDistribution,
      carCategoriesDistribution,
      carVerificationDistribution,
      bookingStatusDistribution,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch platform distributions:', error);
    return NextResponse.json({ message: 'Failed to fetch platform distributions', details: String(error) }, { status: 500 });
  }
}