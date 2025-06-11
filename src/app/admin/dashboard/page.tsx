// src/app/admin/dashboard/page.tsx
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
    FiUsers, FiBox, FiCalendar, FiDollarSign, FiActivity, FiAlertOctagon, 
    FiCheckCircle, FiUserCheck, FiSettings, FiTrendingUp, FiUserPlus, FiCheckSquare, 
    FiStar, FiClock, FiBarChart2} from 'react-icons/fi';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

// --- Component Props and Interfaces ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  link?: string;
  bgColorClass?: string;
  isLoading?: boolean;
  change?: string;
  changeType?: 'positive' | 'negative';
  unit?: string;
}

const StatCard = ({ title, value, icon, link, bgColorClass = "bg-blue-500", isLoading, change, changeType, unit }: StatCardProps) => (
  <div className={`p-5 md:p-6 rounded-xl shadow-lg text-white transition-all duration-300 hover:shadow-2xl ${bgColorClass} ${isLoading && value === '...' ? 'animate-pulse' : ''}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium uppercase tracking-wider opacity-90">{title}</p>
        {isLoading && value === '...' ? (
            // Skeleton for value
            <div className="h-8 w-20 bg-white/20 rounded mt-1"></div>
        ) : (
            <p className="text-2xl sm:text-3xl font-semibold">
                {unit && value !== '...' ? `${unit} ` : ''}{value}
            </p>
        )}
      </div>
      <div className="text-3xl sm:text-4xl opacity-70">{icon}</div>
    </div>
    {!isLoading && change && (
        <p className={`mt-1 text-xs opacity-80 flex items-center ${changeType === 'positive' ? 'text-green-300' : 'text-red-300'}`}>
            {/* TODO: Add up/down arrow icon here based on changeType */}
            {change}
        </p>
    )}
    {!isLoading && link && (
      <Link href={link} className="block mt-2 text-xs sm:text-sm hover:underline opacity-90 font-medium">
        View Details →
      </Link>
    )}
  </div>
);

interface DashboardStats {
  totalUsers: number; newUsersToday: number; newUsersThisWeek: number; newUsersThisMonth: number;
  totalCars: number; pendingVerificationCars: number; activeCars: number;
  platformAverageCarRating: number; totalPlatformRatingsCount: number;
  totalBookings: number; newBookingsToday: number; newBookingsThisWeek: number; newBookingsThisMonth: number;
  activeBookings: number; completedBookings: number;
  totalBookingValue: number; totalPaidRevenue: number; averageBookingValue: number;
}

interface TrendData { date: string; count: number; rawDate?: string; }

interface ApiRecentActivityItem {
    id: string;
    type: string;
    description: string;
    timestamp: string; // ISO string
    linkUrl?: string;
    actorName?: string | null;
    // any other fields your API returns
}
interface RecentActivityItem extends ApiRecentActivityItem {
    icon: React.ReactNode;
}

interface PlatformDistributions {
  userRolesDistribution: { name: string; value: number }[];
  carCategoriesDistribution: { name: string; value: number }[];
  carVerificationDistribution: { name: string; value: number }[];
  bookingStatusDistribution: { name: string; value: number }[];
}

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

// API Fetch Helper
async function fetchAdminApi(endpoint: string, queryParams?: Record<string, string>) {
    const queryString = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';
    const response = await fetch(`/api/admin/${endpoint}${queryString}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to load data from ${endpoint}`}));
        throw new Error(errorData.message);
    }
    return response.json();
}

// Client-side icon mapping
const getActivityIcon = (type: string): React.ReactNode => {
    if (type.toLowerCase().includes('user') || type === 'New User') return <FiUserPlus className="text-indigo-500 h-5 w-5" />;
    if (type.toLowerCase().includes('car') || type === 'New Car Listed') return <FiBox className="text-green-500 h-5 w-5" />;
    if (type.toLowerCase().includes('booking')) return <FiCalendar className="text-blue-500 h-5 w-5" />;
    if (type.toLowerCase().includes('review')) return <FiStar className="text-yellow-500 h-5 w-5" />;
    if (type.toLowerCase().includes('payment')) return <FiDollarSign className="text-red-500 h-5 w-5" />;
    return <FiActivity className="text-gray-500 h-5 w-5" />;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userTrends, setUserTrends] = useState<TrendData[]>([]);
  const [userTrendPeriod, setUserTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [bookingVolume, setBookingVolume] = useState<TrendData[]>([]);
  const [bookingVolumePeriod, setBookingVolumePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [distributions, setDistributions] = useState<PlatformDistributions | null>(null);
  const [isLoadingDistributions, setIsLoadingDistributions] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingUserTrends, setIsLoadingUserTrends] = useState(true);
  const [isLoadingBookingVolume, setIsLoadingBookingVolume] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial KPIs and Recent Activity
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStats(true);
      setIsLoadingActivity(true);
      setError(null);
      setIsLoadingActivity(true); setIsLoadingDistributions(true); setError(null);
      try {
        const [statsData, activityData, distributionsData ] = await Promise.all([
          fetchAdminApi('stats'),
          fetchAdminApi('recent-activity', { limit: '5' }), // Fetch 5 recent activities
          fetchAdminApi('analytics/platform-distributions')
        ]);
        setStats(statsData);
        setRecentActivity(
            (activityData as ApiRecentActivityItem[]).map((act) => ({...act, icon: getActivityIcon(act.type) }))
        );
        setDistributions(distributionsData);
      } catch (err: unknown) { 
        const message = err instanceof Error ? err.message : "An error occurred loading initial dashboard data.";
        setError(message);
        console.error("Initial Dashboard fetch error:", err);
      } finally { 
        setIsLoadingStats(false); 
        setIsLoadingActivity(false);
        setIsLoadingDistributions(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch User Trends data based on period
  useEffect(() => {
    const fetchTrends = async () => {
        setIsLoadingUserTrends(true);
        try {
            const trendsData = await fetchAdminApi('analytics/user-trends', { period: userTrendPeriod });
            setUserTrends(trendsData.sort((a: TrendData, b: TrendData) => new Date(a.rawDate || a.date).getTime() - new Date(b.rawDate || b.date).getTime()));
        } catch (err: unknown) { 
            const message = err instanceof Error ? err.message : String(err);
            setError(prev => prev ? `${prev}\nUser Trends: ${message}` : `User Trends: ${message}`);
            setUserTrends([]); // Clear on error
        } finally { 
            setIsLoadingUserTrends(false); 
        }
    };
    fetchTrends();
  }, [userTrendPeriod]);

  // Fetch Booking Volume data based on period
  useEffect(() => {
    const fetchVolume = async () => {
        setIsLoadingBookingVolume(true);
        try {
            const volumeData = await fetchAdminApi('analytics/booking-volume', { period: bookingVolumePeriod });
            setBookingVolume(volumeData.sort((a: TrendData, b: TrendData) => new Date(a.rawDate || a.date).getTime() - new Date(b.rawDate || b.date).getTime()));
        } catch (err: unknown) { 
            const message = err instanceof Error ? err.message : String(err);
            setError(prev => prev ? `${prev}\nBooking Volume: ${message}` : `Booking Volume: ${message}`);
            setBookingVolume([]); // Clear on error
        } finally { 
            setIsLoadingBookingVolume(false); 
        }
    };
    fetchVolume();
  }, [bookingVolumePeriod]);

  const formatTimestampForActivity = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Recharts custom label for Pie chart
  const RADIAN = Math.PI / 180;
  interface PieLabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
    value: number;
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: PieLabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55; // Position label inside slice
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent * 100 < 5) return null; // Don't render label for very small slices

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px" fontWeight="500">
        {`${name} (${value})`}
      </text>
    );
  };

  // Utility to format enum strings like 'BOOKING_CONFIRMED' to 'Booking Confirmed'
  function formatEnum(enumValue: string): string {
    if (!enumValue) return '';
    return enumValue
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 md:mb-8">Admin Dashboard Overview</h1>

      {error && (
        <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-start">
            <FiAlertOctagon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" /> 
            <div>
                <span className="font-medium block">Error loading dashboard data:</span>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
            </div>
          </div>
      )}

      {/* === KPI Stats Cards Section === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 mb-8 md:mb-10">
        {/* User Stats */}
        <StatCard title="Total Users" value={isLoadingStats ? '...' : stats?.totalUsers ?? '0'} icon={<FiUsers />} link="/admin/users" bgColorClass="bg-gradient-to-br from-indigo-500 to-indigo-700" isLoading={isLoadingStats} />
        <StatCard title="New Users Today" value={isLoadingStats ? '...' : stats?.newUsersToday ?? '0'} icon={<FiUserPlus />} link="/admin/users?filter=today" bgColorClass="bg-gradient-to-br from-sky-500 to-sky-700" isLoading={isLoadingStats} />
        <StatCard title="New Users This Week" value={isLoadingStats ? '...' : stats?.newUsersThisWeek ?? '0'} icon={<FiUserPlus />} bgColorClass="bg-gradient-to-br from-cyan-500 to-cyan-700" isLoading={isLoadingStats} />
        <StatCard title="New Users This Month" value={isLoadingStats ? '...' : stats?.newUsersThisMonth ?? '0'} icon={<FiUserPlus />} bgColorClass="bg-gradient-to-br from-teal-500 to-teal-700" isLoading={isLoadingStats} />

        {/* Car Stats */}
        <StatCard title="Total Cars" value={isLoadingStats ? '...' : stats?.totalCars ?? '0'} icon={<FiBox />} link="/admin/cars" bgColorClass="bg-gradient-to-br from-green-500 to-green-700" isLoading={isLoadingStats} />
        <StatCard title="Active Cars" value={isLoadingStats ? '...' : stats?.activeCars ?? '0'} icon={<FiCheckSquare />} link="/admin/cars?isActive=true&isVerified=true&isListed=true" bgColorClass="bg-gradient-to-br from-emerald-500 to-emerald-700" isLoading={isLoadingStats} />
        <StatCard title="Pending Verification" value={isLoadingStats ? '...' : stats?.pendingVerificationCars ?? '0'} icon={<FiAlertOctagon />} link="/admin/cars?isVerified=false" bgColorClass="bg-gradient-to-br from-yellow-500 to-yellow-600" isLoading={isLoadingStats} />
        <StatCard title="Avg. Car Rating" value={isLoadingStats ? '...' : (stats?.platformAverageCarRating ? `${stats.platformAverageCarRating.toFixed(1)}/5` : 'N/A')} icon={<FiStar />} bgColorClass="bg-gradient-to-br from-orange-500 to-orange-600" isLoading={isLoadingStats} change={isLoadingStats ? undefined : `(${stats?.totalPlatformRatingsCount ?? 0} ratings)`} />
        
        {/* Booking & Financial Stats */}
        <StatCard title="Total Bookings" value={isLoadingStats ? '...' : stats?.totalBookings ?? '0'} icon={<FiCalendar />} link="/admin/bookings" bgColorClass="bg-gradient-to-br from-purple-500 to-purple-700" isLoading={isLoadingStats} />
        <StatCard title="Active Bookings Now" value={isLoadingStats ? '...' : stats?.activeBookings ?? '0'} icon={<FiClock />} link="/admin/bookings?status=CONFIRMED" bgColorClass="bg-gradient-to-br from-fuchsia-500 to-fuchsia-700" isLoading={isLoadingStats} />
        <StatCard title="Completed Bookings" value={isLoadingStats ? '...' : stats?.completedBookings ?? '0'} icon={<FiCheckCircle />} link="/admin/bookings?status=COMPLETED" bgColorClass="bg-gradient-to-br from-blue-500 to-blue-700" isLoading={isLoadingStats} />
        <StatCard title="Total Booking Value" unit="KES" value={isLoadingStats ? '...' : (stats?.totalBookingValue ? stats.totalBookingValue.toLocaleString() : '0')} icon={<FiTrendingUp />} bgColorClass="bg-gradient-to-br from-pink-500 to-pink-700" isLoading={isLoadingStats} />
        <StatCard title="Total Paid Revenue" unit="KES" value={isLoadingStats ? '...' : (stats?.totalPaidRevenue ? stats.totalPaidRevenue.toLocaleString() : '0')} icon={<FiDollarSign />} link="/admin/payments" bgColorClass="bg-gradient-to-br from-red-500 to-red-700" isLoading={isLoadingStats} />
        <StatCard title="Avg. Booking Value" unit="KES" value={isLoadingStats ? '...' : (stats?.averageBookingValue ? stats.averageBookingValue.toLocaleString() : '0')} icon={<FiBarChart2 />} bgColorClass="bg-gradient-to-br from-lime-500 to-lime-700" isLoading={isLoadingStats} />
      </div>

      {/* === Charts Section === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-10">
        {/* User Registration Trends Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 sm:mb-0">New User Registrations</h2>
              <div className="flex space-x-1 self-start sm:self-center">
                  {(['daily', 'weekly', 'monthly'] as const).map(p => (
                      <button
                          key={`user-trend-${p}`}
                          onClick={() => setUserTrendPeriod(p)}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                              userTrendPeriod === p ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                  ))}
              </div>
          </div>
          {isLoadingUserTrends ? (
              <div className="h-72 bg-gray-200 rounded-md animate-pulse flex items-center justify-center text-gray-500">Loading user trends...</div>
          ) : userTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userTrends} margin={{ top: 5, right: 25, left: -10, bottom: 5 }}> {/* Adjusted margins */}
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{fontSize: 10}} interval="preserveStartEnd" />
                      <YAxis stroke="#6b7280" tick={{fontSize: 10}} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '4px' }} itemStyle={{color: '#3b82f6'}}/>
                      <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 1, fill: '#3b82f6' }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }} name="New Users" />
                  </LineChart>
              </ResponsiveContainer>
          ) : (
              <div className="h-72 flex items-center justify-center text-gray-500 text-sm">No user registration data for this period.</div>
          )}
        </div>

        {/* Booking Volume Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700 mb-2 sm:mb-0">Booking Volume</h2>
                <div className="flex space-x-1 self-start sm:self-center">
                    {(['daily', 'weekly', 'monthly'] as const).map(p => (
                        <button
                            key={`booking-volume-${p}`}
                            onClick={() => setBookingVolumePeriod(p)}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                bookingVolumePeriod === p ? 'bg-green-600 text-white font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            {isLoadingBookingVolume ? (
                <div className="h-72 bg-gray-200 rounded-md animate-pulse flex items-center justify-center text-gray-500">Loading booking volume...</div>
            ) : bookingVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingVolume} margin={{ top: 5, right: 25, left: -10, bottom: 5 }}> {/* Adjusted margins */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" tick={{fontSize: 10}} interval="preserveStartEnd" />
                        <YAxis stroke="#6b7280" tick={{fontSize: 10}} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '4px' }} itemStyle={{color: '#10b981'}}/>
                        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                        <Bar dataKey="count" fill="#10b981" name="Bookings" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-72 flex items-center justify-center text-gray-500 text-sm">No booking data for this period.</div>
            )}
        </div>
      </div>
      {/* === NEW: Distribution Charts Section === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-10">
        {/* User Role Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">User Roles</h2>
            {isLoadingDistributions ? (<div className="h-64 bg-gray-200 rounded-md animate-pulse"></div>) : 
             distributions?.userRolesDistribution && distributions.userRolesDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={distributions.userRolesDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                            {distributions.userRolesDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{fontSize: '11px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500 text-sm">No user role data.</div>)}
        </div>

        {/* Car Category Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Car Categories</h2>
            {isLoadingDistributions ? (<div className="h-64 bg-gray-200 rounded-md animate-pulse"></div>) : 
             distributions?.carCategoriesDistribution && distributions.carCategoriesDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={distributions.carCategoriesDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                            {distributions.carCategoriesDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{fontSize: '11px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500 text-sm">No car category data.</div>)}
        </div>
        
        {/* Car Verification Status */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Car Verification</h2>
            {isLoadingDistributions ? (<div className="h-64 bg-gray-200 rounded-md animate-pulse"></div>) : 
             distributions?.carVerificationDistribution && distributions.carVerificationDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={distributions.carVerificationDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                            {distributions.carVerificationDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'Verified' ? PIE_CHART_COLORS[1] : PIE_CHART_COLORS[3]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{fontSize: '11px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500 text-sm">No car verification data.</div>)}
        </div>

        {/* Booking Status Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Booking Statuses</h2>
            {isLoadingDistributions ? (<div className="h-64 bg-gray-200 rounded-md animate-pulse"></div>) : 
             distributions?.bookingStatusDistribution && distributions.bookingStatusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={distributions.bookingStatusDistribution.map(d => ({...d, name: formatEnum(d.name)}))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                            {distributions.bookingStatusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, formatEnum(String(name))]} />
                        <Legend iconSize={10} wrapperStyle={{fontSize: '11px'}} formatter={(value) => formatEnum(value)} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500 text-sm">No booking status data.</div>)}
        </div>
      </div>
      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-3">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/cars?isVerified=false" className="quick-action-link bg-blue-50 hover:bg-blue-100 text-blue-700">
              <FiCheckCircle className="mr-2.5 h-5 w-5" /> Verify New Car Listings ({isLoadingStats ? '...' : stats?.pendingVerificationCars ?? '0'})
            </Link>
            <Link href="/admin/users" className="quick-action-link bg-purple-50 hover:bg-purple-100 text-purple-700">
              <FiUserCheck className="mr-2.5 h-5 w-5" /> Manage Users & Roles
            </Link>
             <Link href="/admin/settings" className="quick-action-link bg-gray-100 hover:bg-gray-200 text-gray-700">
              <FiSettings className="mr-2.5 h-5 w-5" /> Configure Platform Settings
            </Link>
             <Link href="/admin/bookings" className="quick-action-link bg-green-50 hover:bg-green-100 text-green-700">
              <FiCalendar className="mr-2.5 h-5 w-5" /> View All Bookings
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-3">Recent Platform Activity</h2>
          {isLoadingActivity ? (
            <div className="space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded"></div>)}
            </div>
          ) : recentActivity.length > 0 ? (
            <ul className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar"> {/* Added scroll for long lists */}
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-start space-x-3 text-sm pb-2 border-b border-slate-100 last:border-b-0">
                  <span className="flex-shrink-0 mt-0.5 p-1.5 bg-slate-100 rounded-full">{activity.icon}</span>
                  <div className="flex-grow">
                    <p className="text-gray-700 leading-snug">{activity.description}</p>
                    <p className="text-xs text-gray-400">{formatTimestampForActivity(activity.timestamp)}</p>
                  </div>
                  {activity.linkUrl && <Link href={activity.linkUrl} className="text-xs text-blue-500 hover:underline self-center whitespace-nowrap">View →</Link>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-10 text-center">No recent activity to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Add/update CSS in globals.css for custom scrollbar if desired
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1; 
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ccc; 
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #aaa; 
}
.quick-action-link { @apply flex items-center p-3 rounded-lg font-medium transition-colors text-sm; }
*/