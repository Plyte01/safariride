import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client'; // Import BookingStatus if needed for filtering

// Helper function (can be moved to a shared util if used by user-trends as well)
const getDateRangeForTrends = (period: 'daily' | 'weekly' | 'monthly', range: number) => {
    const endDate = new Date();
    const startDate = new Date();
    // For daily, if range is 30, it means last 30 days including today.
    // For weekly, if range is 12, it means last 12 weeks.
    // For monthly, if range is 12, it means last 12 months.
    switch (period) {
        case 'weekly':
            startDate.setDate(endDate.getDate() - (range * 7) + 1); // +1 to make range inclusive of start of week
            break;
        case 'monthly':
            startDate.setMonth(endDate.getMonth() - range + 1); // +1 for similar reason
            startDate.setDate(1); // Start from the first day of that month
            break;
        case 'daily':
        default:
            startDate.setDate(endDate.getDate() - range + 1);
            break;
    }
    startDate.setHours(0, 0, 0, 0); // Normalize start date
    endDate.setHours(23, 59, 59, 999); // Normalize end date to include the whole day
    return { startDate, endDate };
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!session || !user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
  const range = parseInt(searchParams.get('range') || (period === 'daily' ? '30' : period === 'weekly' ? '12' : '12'), 10);
  // Optional filter: by booking status (e.g., only CONFIRMED bookings)
  // const statusFilter = searchParams.get('status') as BookingStatus | null;

  const { startDate, endDate } = getDateRangeForTrends(period, range);
  
  try {
    const bookings = await prisma.booking.findMany({
        where: {
            createdAt: { // Or use booking.startDate for when the booking period starts
                gte: startDate,
                lte: endDate,
            },
            // ...(statusFilter && { status: statusFilter }) // Example if filtering by status
        },
        select: {
            createdAt: true, // Or startDate
        },
        orderBy: {
            createdAt: 'asc', // Or startDate
        }
    });

    // Aggregate counts in JavaScript based on the period
    const trends: Record<string, number> = {};
    const dateFormatOptions: Intl.DateTimeFormatOptions = period === 'monthly' 
        ? { year: 'numeric', month: 'short' } 
        : period === 'weekly' 
        ? { year: '2-digit', month: 'short', day: '2-digit' }
        : { month: 'short', day: 'numeric' };

    bookings.forEach(booking => {
        let dateKey: string;
        const d = new Date(booking.createdAt); // Or new Date(booking.startDate)
        if (period === 'monthly') {
            dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (period === 'weekly') {
            const firstDayOfWeek = new Date(d);
            firstDayOfWeek.setDate(d.getDate() - d.getDay()); // Sunday as first day
            dateKey = firstDayOfWeek.toLocaleDateString('en-CA'); // YYYY-MM-DD
        } else { // daily
            dateKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        }
        
        trends[dateKey] = (trends[dateKey] || 0) + 1;
    });
    
    const chartData = Object.entries(trends)
        .map(([date, count]) => ({
            date: new Date(date).toLocaleDateString(undefined, dateFormatOptions),
            rawDate: date,
            count,
        }))
        .sort((a,b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    return NextResponse.json(chartData, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch booking volume:', error);
    return NextResponse.json({ message: 'Failed to fetch booking volume', details: String(error) }, { status: 500 });
  }
}