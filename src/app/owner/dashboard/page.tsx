// src/app/owner/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiFileText, FiCalendar, FiDollarSign, FiStar } from 'react-icons/fi';//, FiMessageSquare, FiAlertCircle
import { 
    Car, 
    UserRole, 
    BookingStatus, 
    PaymentStatus as PrismaPaymentStatus,
    PaymentMethod as PrismaPaymentMethod
} from '@prisma/client';
import CarAvailabilityCalendar from '@/components/calendar/CarAvailabilityCalendar';

// Type for Car listings displayed on the dashboard
// Use Car from Prisma directly, as no extra fields are needed

// Type for Bookings on Owner's cars, including related data
interface OwnerManagedBooking {
  id: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  returnLocation: string;
  totalPrice: number;
  notes: string | null;
  car: { 
    id: string; 
    title: string | null;
    make: string; 
    model: string; 
    images: string[]; 
  };
  user: {
    id: string; 
    name: string | null; 
    email: string; 
    phoneNumber: string | null;
    phoneVerified: boolean;
  }; 
  payment: { 
    id: string;
    status: PrismaPaymentStatus; 
    paymentMethod: PrismaPaymentMethod; 
    amount: number; 
    currency: string; 
  } | null;
}

// Helper function to format dates
const formatDate = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short', // Using short month for brevity
    day: 'numeric',
  });
};

// Helper function to format enum values for display (e.g., ON_DELIVERY_PENDING -> On Delivery Pending)
const formatEnumValue = (value?: string): string => {
    if (!value) return 'N/A';
    return value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Helper function to get Tailwind CSS classes for booking status badges
const getBookingStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.CONFIRMED: return 'bg-green-100 text-green-800';
      case BookingStatus.PENDING:
      case BookingStatus.AWAITING_PAYMENT:
      case BookingStatus.ON_DELIVERY_PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case BookingStatus.CANCELLED: // Assuming one "CANCELLED" status from your schema
      case BookingStatus.PAYMENT_FAILED:
        return 'bg-red-100 text-red-800';
      case BookingStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case BookingStatus.NO_SHOW:
        return 'bg-purple-100 text-purple-800'; // Added NO_SHOW styling
      default: return 'bg-gray-100 text-gray-800';
    }
};

interface DashboardStats {
  totalEarnings: number;
  activeBookings: number;
  averageRating: number;
  totalReviews: number;
  //pendingMessages: number;
  //maintenanceAlerts: number;
}

export default function OwnerDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [cars, setCars] = useState<Car[]>([]);
  const [managedBookings, setManagedBookings] = useState<OwnerManagedBooking[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'myCars' | 'manageBookings'>('myCars');
  const [bookingActionLoading, setBookingActionLoading] = useState<Record<string, boolean>>({});

  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    //pendingMessages: 0,
    //maintenanceAlerts: 0,
  });

  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/owner/dashboard');
      return;
    }
    interface SessionUser {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
    }
    const userRole = (session.user as SessionUser).role;
    if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      router.push('/?error=access_denied_owner_dashboard');
      return;
    }

    const fetchOwnerData = async () => {
        if (!session.user.id) return;

        // Fetch Owner's Cars
        setIsLoadingCars(true);
        try {
            const carsResponse = await fetch(`/api/users/${session.user.id}/cars`); // Assuming this endpoint exists
            if (!carsResponse.ok) {
                 const errorData = await carsResponse.json().catch(() => ({ message: "Failed to fetch your car listings."}));
                 throw new Error(errorData.message);
            }
            setCars(await carsResponse.json());
        } catch (err: unknown) { 
            const errorMessage = err instanceof Error ? err.message : String(err);
            setPageError(prev => prev ? `${prev}\nCar fetch error: ${errorMessage}` : `Car fetch error: ${errorMessage}`);
        }
        finally { setIsLoadingCars(false); }

        // Fetch Bookings for Owner's Cars
        setIsLoadingBookings(true);
        try {
            const bookingsResponse = await fetch('/api/owner/bookings');
            if (!bookingsResponse.ok) {
                const errorData = await bookingsResponse.json().catch(() => ({ message: "Failed to fetch bookings for your cars."}));
                throw new Error(errorData.message);
            }
            setManagedBookings(await bookingsResponse.json());
        } catch (err: unknown) { 
            const errorMessage = err instanceof Error ? err.message : String(err);
            setPageError(prev => prev ? `${prev}\nBooking fetch error: ${errorMessage}` : `Booking fetch error: ${errorMessage}`);
        }
        finally { setIsLoadingBookings(false); }
    };
    
    if (session.user?.id) {
        fetchOwnerData();
    }

  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch('/api/owner/dashboard/stats');
        const statsData = await statsRes.json();
        
        if (!statsRes.ok) {
          throw new Error(statsData.details || statsData.error || 'Failed to fetch dashboard stats');
        }
        
        setStats(statsData);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setPageError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to permanently delete this car listing and all its associated data (bookings, reviews)? This action cannot be undone.')) {
        return;
    }
    try {
        const response = await fetch(`/api/cars/${carId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to delete car" }));
            throw new Error(errorData.message);
        }
        setCars(prevCars => prevCars.filter(car => car.id !== carId));
        // Also, might need to remove bookings associated with this car from managedBookings if displayed
        setManagedBookings(prev => prev.filter(b => b.car.id !== carId));
        alert('Car deleted successfully!');
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Error deleting car: ${errorMessage}`);
        setPageError(errorMessage);
    }
  };

  const handleBookingStatusUpdate = async (bookingId: string, newStatus: BookingStatus, reason?: string) => {
    const originalBookings = [...managedBookings];
    setBookingActionLoading(prev => ({...prev, [bookingId]: true}));
    
    // Optimistic update for faster UI feedback
    setManagedBookings(prev => prev.map(b => b.id === bookingId ? {...b, status: newStatus } : b));

    try {
        const response = await fetch(`/api/owner/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus, reason }),
        });
        const updatedBookingData = await response.json();
        if (!response.ok) {
            throw new Error(updatedBookingData.message || 'Failed to update booking status.');
        }
        // Confirm update from server response
        setManagedBookings(prev => prev.map(b => b.id === bookingId ? {...b, ...updatedBookingData} : b));
        alert(`Booking status updated to ${formatEnumValue(newStatus)}.`);
    } catch (err: unknown) {
        setManagedBookings(originalBookings); // Rollback on error
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Error updating booking: ${errorMessage}`);
        setPageError(errorMessage);
    } finally {
        setBookingActionLoading(prev => ({...prev, [bookingId]: false}));
    }
  };

  const handleMarkAsPaid = async (bookingId: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update payment status');
      }

      const updatedBooking = await response.json();
      setManagedBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? { ...booking, payment: updatedBooking.payment } : booking
        )
      );
      setSuccess('Payment status updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (sessionStatus === 'loading' || (isLoadingCars && activeTab === 'myCars') || (isLoadingBookings && activeTab === 'manageBookings')) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">Loading Owner Dashboard...</p></div>;
  }

  // Access denied check (should be caught by redirect in useEffect, but good fallback)
  interface SessionUser {
    id: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
  }
  const userRole = session ? (session.user as SessionUser).role : null;
  if (!session || (userRole && userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN)) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
              <h1 className="text-3xl font-bold mb-6">Access Denied</h1>
              <p className="text-red-600 bg-red-100 p-4 rounded-md">You must be logged in as a Car Owner or Admin to view this page.</p>
              <Link href="/auth/login?callbackUrl=/owner/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
                  Login
              </Link>
          </div>
      );
  }

  // Calculate count for pending actions tab
  const pendingActionCount = managedBookings.filter(b => 
      b.status === BookingStatus.ON_DELIVERY_PENDING || 
      b.status === BookingStatus.AWAITING_PAYMENT || // If owner needs to monitor this
      b.status === BookingStatus.PENDING
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Owner Dashboard</h1>
        {activeTab === 'myCars' && (
            <Link href="/list-your-car" className="btn-primary text-sm self-start sm:self-center">
            + List New Car
            </Link>
        )}
      </div>

      {pageError && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">{pageError}</div>}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('myCars')}
            className={`tab-button ${activeTab === 'myCars' ? 'tab-active' : 'tab-inactive'}`}>
            My Car Listings <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">{cars.length}</span>
          </button>
          <button onClick={() => setActiveTab('manageBookings')}
            className={`tab-button ${activeTab === 'manageBookings' ? 'tab-active' : 'tab-inactive'}`}>
            Manage Bookings 
            {pendingActionCount > 0 && 
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">{pendingActionCount} Pending</span>
            }
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'myCars' && (
        <div>
          {isLoadingCars && <div className="text-center py-5">Loading your cars...</div>}
          {!isLoadingCars && cars.length === 0 && !pageError && (
            <div className="text-center py-10 bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-lg">You haven&#39;t listed any cars yet.</p>
              <Link href="/list-your-car" className="mt-4 inline-block btn-primary">List Your First Car</Link>
            </div>
          )}
          {!isLoadingCars && cars.length > 0 && (
            <div className="space-y-6">
              {cars.map((car) => (
                <div key={car.id} className="flex flex-col md:flex-row items-start bg-white p-4 rounded-lg shadow gap-4">
                  <Image
                    src={car.images && car.images.length > 0 ? car.images[0] : '/placeholder-car.svg'} // Generic placeholder
                    alt={car.title || `${car.make} ${car.model}`}
                    width={192}
                    height={128}
                    className="w-full md:w-48 h-40 md:h-32 object-cover rounded-md mb-4 md:mb-0 flex-shrink-0"
                    priority
                  />
                  <div className="flex-grow">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{car.title || `${car.make} ${car.model}`} ({car.year})</h2>
                    <p className="text-sm text-gray-500">{car.location}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`status-badge ${car.isActive && car.isListed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {car.isActive && car.isListed ? 'Actively Listed' : 'Not Active/Listed'}
                        </span>
                        <span className={`status-badge ${car.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {car.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 md:mt-0 w-full sm:w-auto">
                    <Link href={`/owner/edit-car/${car.id}`} className="btn-sm btn-warning w-full sm:w-auto text-center">Edit</Link>
                    <button onClick={() => handleDeleteCar(car.id)} className="btn-sm btn-danger w-full sm:w-auto">Delete</button>
                    <Link href={`/cars/${car.id}`} target="_blank" rel="noopener noreferrer" className="btn-sm btn-info w-full sm:w-auto text-center">View Public</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'manageBookings' && (
        <div>
          {isLoadingBookings && <div className="text-center py-5">Loading bookings for your cars...</div>}
          {!isLoadingBookings && managedBookings.length === 0 && !pageError && (
            <div className="text-center py-10 bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-lg">No bookings found for your cars yet.</p>
            </div>
          )}
          {!isLoadingBookings && managedBookings.length > 0 && (
            <div className="space-y-6">
              {managedBookings.map((booking) => (
                <div key={booking.id} className="flex flex-col md:flex-row items-start bg-white p-4 rounded-lg shadow gap-4">
                  <div className="md:w-1/3 w-full">
                    <Image 
                      src={booking.car.images && booking.car.images.length > 0 ? booking.car.images[0] : '/placeholder-car.svg'}
                      alt={booking.car.title || `${booking.car.make} ${booking.car.model}`}
                      width={256}
                      height={128}
                      className="w-full h-32 object-cover rounded-md shadow-sm"
                      priority
                    />
                    <p className="text-xs text-center mt-1 font-semibold text-gray-700">{booking.car.title || `${booking.car.make} ${booking.car.model}`}</p>
                  </div>
                  <div className="sm:w-2/3 md:w-3/4 w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Renter: {booking.user.name || 'N/A'} <span className="text-gray-500 font-normal">({booking.user.email})</span></p>
                        <p className="text-xs text-gray-500">Booking ID: {booking.id.substring(0,8)}...</p>
                        {booking.user.phoneNumber && (
                          <p className="text-xs text-gray-600 mt-1">
                            Phone: {booking.user.phoneNumber}
                            {booking.user.phoneVerified ? (
                              <span className="ml-1 text-green-600">✓ Verified</span>
                            ) : (
                              <span className="ml-1 text-orange-600">⚠ Not Verified</span>
                            )}
                          </p>
                        )}
                      </div>
                      <span className={`status-badge text-xs mt-2 sm:mt-0 ${getBookingStatusColor(booking.status as BookingStatus)}`}>
                        {formatEnumValue(booking.status as BookingStatus)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-0.5 border-t pt-2">
                      <p><strong>Period:</strong> {formatDate(booking.startDate)} to {formatDate(booking.endDate)}</p>
                      <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
                      <p><strong>Return:</strong> {booking.returnLocation}</p>
                      <p><strong>Price:</strong> {booking.payment?.currency || 'KES'} {booking.totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      <div className="flex items-center gap-2">
                        <p><strong>Payment:</strong> {formatEnumValue(booking.payment?.paymentMethod)} - {formatEnumValue(booking.payment?.status)}</p>
                        {booking.payment?.status === PrismaPaymentStatus.PENDING && (
                          <button
                            onClick={() => handleMarkAsPaid(booking.id)}
                            disabled={isUpdating}
                            className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdating ? 'Updating...' : 'Mark as Paid'}
                          </button>
                        )}
                      </div>
                    </div>
                    {booking.notes && <p className="mt-1 text-xs text-gray-500 italic"><strong>Renter Notes:</strong> {booking.notes}</p>}

                    <div className="mt-3 pt-2 border-t border-gray-200 flex flex-wrap gap-2 text-xs">
                      <Link 
                          href={`/api/bookings/${booking.id}/invoice/download`} 
                          target="_blank"
                          className="btn-sm btn-outline-secondary flex items-center"
                          download
                      >
                          <FiFileText className="mr-1.5 h-3.5 w-3.5"/> Download Invoice
                      </Link>
                      {bookingActionLoading[booking.id] ? <span className="text-xs italic text-gray-500">Processing...</span> : (
                          <>
                              {booking.status === BookingStatus.ON_DELIVERY_PENDING && (
                                <button onClick={() => handleBookingStatusUpdate(booking.id, BookingStatus.CONFIRMED)} className="btn-xs btn-success">Confirm Pickup & Booking</button>
                              )}
                              {booking.status === BookingStatus.CONFIRMED && (
                                  <>
                                      {new Date(booking.endDate) < new Date() && (
                                          <button onClick={() => handleBookingStatusUpdate(booking.id, BookingStatus.COMPLETED)} className="btn-xs btn-info">Mark as Completed</button>
                                      )}
                                      <button onClick={() => handleBookingStatusUpdate(booking.id, BookingStatus.NO_SHOW)} className="btn-xs btn-warning-outline">Mark as No-Show</button>
                                  </>
                              )}
                              {([BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.ON_DELIVERY_PENDING, BookingStatus.CONFIRMED] as BookingStatus[]).includes(booking.status as BookingStatus) && (
                                <button 
                                  onClick={() => {
                                      const reason = prompt("Reason for cancellation (optional):");
                                      if (reason !== null) {
                                          handleBookingStatusUpdate(booking.id, BookingStatus.CANCELLED, reason || "Cancelled by Owner");
                                      }
                                  }} 
                                  className="btn-xs btn-danger-outline">
                                  Cancel Booking
                                </button>
                              )}
                          </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Total Earnings</h3>
            <FiDollarSign className="text-green-500 text-xl" />
          </div>
          <p className="text-2xl font-bold">KES {stats.totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Active Bookings</h3>
            <FiCalendar className="text-blue-500 text-xl" />
          </div>
          <p className="text-2xl font-bold">{stats.activeBookings}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Average Rating</h3>
            <FiStar className="text-yellow-500 text-xl" />
          </div>
          <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
          <p className="text-sm text-gray-500">from {stats.totalReviews} reviews</p>
        </div>

        {/* <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pending Messages</h3>
            <Link href="/owner/messages" className="text-blue-500 hover:text-blue-600">
              <FiMessageSquare className="text-blue-500 text-xl" />
            </Link>
          </div>
          <p className="text-2xl font-bold">{stats.pendingMessages}</p>
          <Link href="/owner/messages" className="text-sm text-blue-500 hover:text-blue-600">
            View Messages →
          </Link>
        </div> */}

        {/* <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Maintenance Alerts</h3>
            <FiAlertCircle className="text-red-500 text-xl" />
          </div>
          <p className="text-2xl font-bold">{stats.maintenanceAlerts}</p>
        </div> */}
      </div>

      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Calendar</h2>
          <CarAvailabilityCalendar
            carId="all"
            bookings={managedBookings}
            readOnly={true}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {managedBookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{booking.user.name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {booking.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Add to globals.css or a relevant CSS module
