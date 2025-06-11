import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { UserRole, Prisma } from '@prisma/client'; // UserRole is your enum for roles

const DEFAULT_USERS_PER_PAGE = 10; // Define how many users per page


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  type SessionUser = {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };

  const user = session?.user as SessionUser | undefined;

  if (!session || !user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || String(DEFAULT_USERS_PER_PAGE), 10);
  const searchTerm = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') as UserRole | null; // e.g., RENTER, OWNER, ADMIN
  const statusFilter = searchParams.get('status'); // e.g., 'active', 'blocked' (you'll need a 'isBlocked' field on User model for this)
  const trustFilter = searchParams.get('trust'); // e.g., 'trusted', 'untrusted'


  const skip = (page - 1) * limit;

  const whereClause: Prisma.UserWhereInput = {};

  if (searchTerm) {
    whereClause.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (roleFilter && Object.values(UserRole).includes(roleFilter)) {
    whereClause.role = roleFilter;
  }
  
  // Example for 'isBlocked' status - requires 'isBlocked' field on User model
  if (statusFilter === 'blocked') {
    whereClause.isBlocked = true;
  } else if (statusFilter === 'active') {
    whereClause.isBlocked = false; // Or undefined if isBlocked can be null
  }

  if (trustFilter === 'trusted') {
    whereClause.isTrustedOwner = true;
  } else if (trustFilter === 'untrusted') {
    whereClause.isTrustedOwner = false;
  }


  try {
    const users = await prisma.user.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: { // Select fields needed for the admin list, avoid sending password
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        isTrustedOwner: true,
        // isBlocked: true, // If you add this field
        createdAt: true,
        updatedAt: true,
        _count: {
            select: { cars: true, bookings: true } // Count related items
        }
      },
    });

    const totalUsers = await prisma.user.count({ where: whereClause });
    const totalPages = Math.ceil(totalUsers / DEFAULT_USERS_PER_PAGE);

    return NextResponse.json({
      users,
      currentPage: page,
      totalPages,
      totalUsers,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch users for admin:', error);
    return NextResponse.json({ message: 'Failed to fetch users', details: String(error) }, { status: 500 });
  }
}