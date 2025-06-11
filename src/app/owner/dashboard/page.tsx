// src/app/owner/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiFileText } from 'react-icons/fi';
import { 
    Car, 
    UserRole, 
    Booking, 
    BookingStatus, 
    PaymentStatus as PrismaPaymentStatus, // Aliased to avoid conflict
    PaymentMethod as PrismaPaymentMethod // Aliased
} from '@prisma/client';

// Type for Car listings displayed on the dashboard
// Use Car from Prisma directly, as no extra fields are needed

// Type for Bookings on Owner's cars, including related data
interface OwnerManagedBooking extends Omit<Booking, 'car' | 'payment' | 'user' | 'review'> {
  car: { 
    id: string; 
    title: string | null; // title is now optional in Car model from your schema
    make: string; 
    model: string; 
    images: string[]; 
  };
  user: { // This is the Renter
    id: string; 
    name: string | null; 
    email: string; 
  }; 
  payment: { 
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


export default function OwnerDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [cars, setCars] = useState<Car[]>([]);
  const [managedBookings, setManagedBookings] = useState<OwnerManagedBooking[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null); // General error for the page

  const [activeTab, setActiveTab] = useState<'myCars' | 'manageBookings'>('myCars');
  const [bookingActionLoading, setBookingActionLoading] = useState<Record<string, boolean>>({}); // For per-booking loading state


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
        setManagedBookings(prev => prev.filter(b => b.carId !== carId));
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
                      </div>
                      <span className={`status-badge text-xs mt-2 sm:mt-0 ${getBookingStatusColor(booking.status)}`}>
                        {formatEnumValue(booking.status)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-0.5 border-t pt-2">
                      <p><strong>Period:</strong> {formatDate(booking.startDate)} to {formatDate(booking.endDate)}</p>
                      <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
                      <p><strong>Return:</strong> {booking.returnLocation}</p>
                      <p><strong>Price:</strong> {booking.payment?.currency || 'KES'} {booking.totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      {booking.payment && <p><strong>Payment:</strong> {formatEnumValue(booking.payment.paymentMethod)} - {formatEnumValue(booking.payment.status)}</p>}
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
                              {([BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.ON_DELIVERY_PENDING, BookingStatus.CONFIRMED] as BookingStatus[]).includes(booking.status) && (
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
    </div>
  );
}

// Add to globals.css or a relevant CSS module
/*
.tab-button { @apply whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm outline-none; }
.tab-active { @apply border-blue-500 text-blue-600; }
.tab-inactive { @apply border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300; }

.status-badge { @apply px-2 inline-flex text-xs leading-5 font-semibold rounded-full; }

.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 py-2 px-4 rounded shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2; }

.btn-sm { @apply py-1.5 px-3 rounded text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1; }
.btn-xs { @apply py-1 px-2.5 rounded text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-1; }

.btn-warning { @apply bg-yellow-500 text-black hover:bg-yellow-600 focus:ring-yellow-500; }
.btn-danger { @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500; }
.btn-info { @apply bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500; }
.btn-success { @apply bg-green-500 text-white hover:bg-green-600 focus:ring-green-500; }

.btn-danger-outline { @apply border border-red-500 text-red-600 hover:bg-red-50 focus:ring-red-500; }
.btn-warning-outline { @apply border border-yellow-500 text-yellow-700 hover:bg-yellow-50 focus:ring-yellow-500; }
*/