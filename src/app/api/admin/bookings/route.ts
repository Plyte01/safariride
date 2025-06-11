import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { UserRole, BookingStatus, Prisma } from '@prisma/client';

const BOOKINGS_PER_PAGE = 10; // Set the number of bookings per page

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const sessionUser = session?.user as SessionUser | undefined;
  if (!session || !sessionUser || sessionUser.role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchTerm = searchParams.get('search') || ''; // Search by booking ID, car title/make/model, renter/owner name/email
  
  // Filters
  const carIdFilter = searchParams.get('carId');
  const userIdFilter = searchParams.get('userId'); // Renter's ID
  const ownerIdFilter = searchParams.get('ownerId'); // To filter by car owner
  const statusFilter = searchParams.get('status') as BookingStatus | null;
  const dateFromFilter = searchParams.get('dateFrom');
  const dateToFilter = searchParams.get('dateTo');
  
  const skip = (page - 1) * BOOKINGS_PER_PAGE;

  const whereClause: Prisma.BookingWhereInput = {};
  const andConditions: Prisma.BookingWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { car: { 
            OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { make: { contains: searchTerm, mode: 'insensitive' } },
                { model: { contains: searchTerm, mode: 'insensitive' } },
            ]
        }},
        { user: { // Renter
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
            ]
        }},
        { car: { owner: { // Car Owner
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
            ]
        }}}
      ],
    });
  }

  if (carIdFilter) andConditions.push({ carId: carIdFilter });
  if (userIdFilter) andConditions.push({ userId: userIdFilter });
  if (ownerIdFilter) andConditions.push({ car: { ownerId: ownerIdFilter }});
  if (statusFilter && Object.values(BookingStatus).includes(statusFilter)) {
    andConditions.push({ status: statusFilter });
  }
  if (dateFromFilter) {
    const from = new Date(dateFromFilter);
    if (!isNaN(from.getTime())) andConditions.push({ startDate: { gte: from } });
  }
  if (dateToFilter) {
    const to = new Date(dateToFilter);
    if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999); // Include whole day
        andConditions.push({ endDate: { lte: to } });
    }
  }
  
  if(andConditions.length > 0){
    whereClause.AND = andConditions;
  }

  // Sorting (example)
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  let orderByClause: Prisma.BookingOrderByWithRelationInput = {};
  if (sortBy === 'startDate') orderByClause = { startDate: sortOrder as Prisma.SortOrder };
  else if (sortBy === 'totalPrice') orderByClause = { totalPrice: sortOrder as Prisma.SortOrder };
  else orderByClause = { createdAt: sortOrder as Prisma.SortOrder };


  try {
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      skip: skip,
      take: BOOKINGS_PER_PAGE,
      orderBy: orderByClause,
      include: {
        car: {
          select: { id: true, title: true, make: true, model: true, images: true, owner: { select: {id: true, name: true, email: true}} },
        },
        user: { // Renter
          select: { id: true, name: true, email: true },
        },
        payment: {
          select: { id: true, status: true, paymentMethod: true, amount: true },
        },
      },
    });

    const totalBookings = await prisma.booking.count({ where: whereClause });
    const totalPages = Math.ceil(totalBookings / BOOKINGS_PER_PAGE);

    return NextResponse.json({
      bookings,
      currentPage: page,
      totalPages,
      totalBookings,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch bookings for admin:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings', details: String(error) }, { status: 500 });
  }
}