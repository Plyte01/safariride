import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { UserRole, CarCategory, Prisma } from '@prisma/client';

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

// Number of cars per page for pagination
const CARS_PER_PAGE = 10;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const sessionUser = session?.user as SessionUser | undefined;
  if (!session || !sessionUser || sessionUser.role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchTerm = searchParams.get('search') || ''; // Search by title, make, model, owner name/email
  
  // Filters
  const ownerIdFilter = searchParams.get('ownerId');
  const verificationFilter = searchParams.get('isVerified'); // 'true', 'false'
  const listedFilter = searchParams.get('isListed');       // 'true', 'false'
  const activeFilter = searchParams.get('isActive');         // 'true', 'false'
  const categoryFilter = searchParams.get('category') as CarCategory | null;
  const makeFilter = searchParams.get('make');
  
  const skip = (page - 1) * CARS_PER_PAGE;

  const whereClause: Prisma.CarWhereInput = {};
  const andConditions: Prisma.CarWhereInput[] = []; // Use AND array for combining multiple text searches

  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { make: { contains: searchTerm, mode: 'insensitive' } },
        { model: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
        { owner: { 
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
            ]
         }},
      ],
    });
  }

  if (ownerIdFilter) {
    andConditions.push({ ownerId: ownerIdFilter });
  }
  if (verificationFilter === 'true') {
    andConditions.push({ isVerified: true });
  } else if (verificationFilter === 'false') {
    andConditions.push({ isVerified: false });
  }
  if (listedFilter === 'true') {
    andConditions.push({ isListed: true });
  } else if (listedFilter === 'false') {
    andConditions.push({ isListed: false });
  }
  if (activeFilter === 'true') {
    andConditions.push({ isActive: true });
  } else if (activeFilter === 'false') {
    andConditions.push({ isActive: false });
  }
  if (categoryFilter && Object.values(CarCategory).includes(categoryFilter)) {
    andConditions.push({ category: categoryFilter });
  }
  if (makeFilter) {
    andConditions.push({ make: { contains: makeFilter, mode: 'insensitive' } });
  }
  
  if(andConditions.length > 0){
    whereClause.AND = andConditions;
  }


  // Sorting (example, can be extended)
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  let orderByClause: Prisma.CarOrderByWithRelationInput = {};
  if (sortBy === 'pricePerDay') {
    orderByClause = { pricePerDay: sortOrder as Prisma.SortOrder };
  } else if (sortBy === 'ownerName') {
    orderByClause = { owner: { name: sortOrder as Prisma.SortOrder }};
  } else {
    orderByClause = { createdAt: sortOrder as Prisma.SortOrder };
  }


  try {
    const cars = await prisma.car.findMany({
      where: whereClause,
      skip: skip,
      take: CARS_PER_PAGE,
      orderBy: orderByClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // _count: { select: { bookings: true, reviews: true } } // Optional: counts
      },
    });

    const totalCars = await prisma.car.count({ where: whereClause });
    const totalPages = Math.ceil(totalCars / CARS_PER_PAGE);

    return NextResponse.json({
      cars,
      currentPage: page,
      totalPages,
      totalCars,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch cars for admin:', error);
    return NextResponse.json({ message: 'Failed to fetch cars', details: String(error) }, { status: 500 });
  }
}