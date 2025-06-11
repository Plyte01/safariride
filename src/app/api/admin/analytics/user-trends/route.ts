// src/app/api/admin/analytics/user-trends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path as necessary
import { UserRole } from '@prisma/client';

// Helper function to determine the start and end dates for the query
const getDateRangeForTrends = (period: 'daily' | 'weekly' | 'monthly', range: number) => {
    const endDate = new Date(); // Today is the end of the range
    let startDate = new Date();

    switch (period) {
        case 'weekly':
            // Go back `range` number of weeks, then find the start of that week (e.g., Sunday)
            startDate.setDate(endDate.getDate() - (range * 7));
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Set to Sunday of that week
            break;
        case 'monthly':
            // Go back `range` number of months, then set to the 1st day of that month
            startDate = new Date(endDate.getFullYear(), endDate.getMonth() - range + 1, 1);
            break;
        case 'daily':
        default:
            // Go back `range` number of days
            startDate.setDate(endDate.getDate() - range + 1);
            break;
    }
    startDate.setHours(0, 0, 0, 0); // Normalize start date to beginning of the day
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
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
  // Default ranges: 30 days for daily, 12 weeks for weekly, 12 months for monthly
  const defaultRange = period === 'daily' ? 30 : 12;
  const range = parseInt(searchParams.get('range') || String(defaultRange), 10);

  if (isNaN(range) || range <= 0) {
    return NextResponse.json({ message: 'Invalid range parameter. Must be a positive number.' }, { status: 400 });
  }

  const { startDate, endDate } = getDateRangeForTrends(period, range);
  
  try {
    // Fetch users created within the calculated date range
    const users = await prisma.user.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            createdAt: true, // We only need the creation date for grouping
        },
        orderBy: {
            createdAt: 'asc', // Sorting helps if we iterate to fill gaps, though JS aggregation handles it
        }
    });

    // Aggregate user counts in JavaScript based on the selected period
    const trends: Record<string, number> = {}; // Key: YYYY-MM-DD (or YYYY-MM for monthly), Value: count

    // Pre-fill all dates/weeks/months in the range with 0 counts to ensure a continuous timeline
    // eslint-disable-next-line prefer-const
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            let key: string;
            if (period === 'monthly') {
                key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            } else { // daily or weekly (for weekly, key will be start of week)
                const dateForKey = new Date(currentDate);
                if (period === 'weekly') {
                    dateForKey.setDate(currentDate.getDate() - currentDate.getDay()); // Get Sunday of this week
                }
                key = dateForKey.toLocaleDateString('en-CA'); // YYYY-MM-DD
            }
            trends[key] = 0; // Initialize with 0
    
            if (period === 'monthly') {
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1); // Ensure we always start from the 1st for next month
            } else if (period === 'weekly') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else { // daily
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    
    // Now, populate with actual counts
    users.forEach(user => {
        let dateKey: string;
        const d = new Date(user.createdAt);
        if (period === 'monthly') {
            dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        } else if (period === 'weekly') {
            // Get the Sunday of that week
            const firstDayOfWeek = new Date(d);
            firstDayOfWeek.setDate(d.getDate() - d.getDay()); // Sunday
            firstDayOfWeek.setHours(0,0,0,0);
            dateKey = firstDayOfWeek.toLocaleDateString('en-CA'); // YYYY-MM-DD
        } else { // daily
            dateKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        }
        
        if (trends[dateKey] !== undefined) { // Should always be defined due to pre-fill
            trends[dateKey]++;
        }
    });
    
    // Format for charting libraries
    const dateFormatOptions: Intl.DateTimeFormatOptions = period === 'monthly' 
        ? { year: 'numeric', month: 'short' } 
        : period === 'weekly' 
        ? { month: 'short', day: 'numeric' } // Show start of week
        : { month: 'short', day: 'numeric' };

    const chartData = Object.entries(trends)
        .map(([date, count]) => ({
            // For monthly, `date` is YYYY-MM. new Date('YYYY-MM') will be first day of month UTC.
            // For weekly/daily, `date` is YYYY-MM-DD.
            date: new Date(date + (period === 'monthly' ? '-02' : '')).toLocaleDateString('en-US', dateFormatOptions), // Use en-US for consistent month names, adjust locale if needed. Adding '-02' for month to avoid timezone issues with YYYY-MM.
            rawDate: date, 
            count,
        }))
        .sort((a,b) => new Date(a.rawDate + (period === 'monthly' ? '-02' : '')).getTime() - new Date(b.rawDate + (period === 'monthly' ? '-02' : '')).getTime()); // Sort by actual date

    return NextResponse.json(chartData, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch user trends:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch user trends', details: errorMessage }, { status: 500 });
  }
}