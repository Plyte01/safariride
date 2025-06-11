// src/app/my-bookings/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react'; // Added FormEvent, Fragment
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Booking as PrismaBooking, 
    Car as PrismaCar, 
    BookingStatus, 
    Review as PrismaReview,
    Payment as PrismaPayment,
    PaymentMethod as PrismaPaymentMethod
} from '@prisma/client';
import Image from 'next/image';
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { 
    CalendarClock, CarFront, AlertTriangle, CheckCircle, XCircle, Hourglass, 
    ShoppingCart, FileText, Star, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Ensure your Prisma types are correct, especially for car images and review presence
interface BookingWithDetails extends PrismaBooking {
  car: Pick<PrismaCar, 'id' | 'make' | 'model' | 'year' | 'images' | 'location' | 'title'>;
  review?: Pick<PrismaReview, 'id'> | null;
  payment?: Pick<PrismaPayment, 'id' | 'status' | 'paymentMethod' | 'amount' | 'currency'> | null; 
}

const CANCELLATION_WINDOW_HOURS = 1; // Example: Cannot cancel within 1 hour of pickup

export default function MyBookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const filteredBookings = bookings.filter(booking => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const bookingStartDate = new Date(booking.startDate);
    bookingStartDate.setHours(0,0,0,0);
    
    const nonActivePastStatuses: BookingStatus[] = [
      BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.PAYMENT_FAILED
    ];

    if (activeFilter === 'upcoming') {
      return bookingStartDate >= now && !nonActivePastStatuses.includes(booking.status);
    }
    if (activeFilter === 'past') {
      return bookingStartDate < now || nonActivePastStatuses.includes(booking.status);
    }
    return true;
  }).sort((a,b) => {
      const nonFinalStatuses: BookingStatus[] = [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW];
      const aIsUpcomingNonFinal = new Date(a.startDate) >= new Date() && !nonFinalStatuses.includes(a.status);
      const bIsUpcomingNonFinal = new Date(b.startDate) >= new Date() && !nonFinalStatuses.includes(b.status);

      if (aIsUpcomingNonFinal && !bIsUpcomingNonFinal) return -1;
      if (!aIsUpcomingNonFinal && bIsUpcomingNonFinal) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime(); 
  });

  const fetchBookings = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users/my-bookings'); 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch your bookings.' }));
        throw new Error(errorData.message);
      }
      const data: BookingWithDetails[] = await response.json();
      setBookings(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Error loading bookings: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus]); 

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/my-bookings');
      return;
    }
    if (sessionStatus === 'authenticated') {
        fetchBookings();
    }
  }, [session, sessionStatus, router, fetchBookings]);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-100"><Hourglass className="mr-1.5 h-3 w-3"/>Pending</Badge>;
      case BookingStatus.CONFIRMED:
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1.5 h-3 w-3"/>Confirmed</Badge>;
      case BookingStatus.CANCELLED:
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-500"><XCircle className="mr-1.5 h-3 w-3"/>Cancelled</Badge>;
      case BookingStatus.COMPLETED:
        return <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-100"><CheckCircle className="mr-1.5 h-3 w-3"/>Completed</Badge>;
      case BookingStatus.AWAITING_PAYMENT:
        return <Badge variant="outline" className="border-sky-500 text-sky-700 bg-sky-100"><ShoppingCart className="mr-1.5 h-3 w-3"/>Awaiting Payment</Badge>;
      case BookingStatus.ON_DELIVERY_PENDING:
        return <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-100"><CarFront className="mr-1.5 h-3 w-3"/>Pay on Delivery</Badge>;
      case BookingStatus.PAYMENT_FAILED:
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-500"><AlertTriangle className="mr-1.5 h-3 w-3"/>Payment Failed</Badge>;
       case BookingStatus.NO_SHOW:
         return <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-500"><AlertTriangle className="mr-1.5 h-3 w-3"/>No Show</Badge>;
      default:
        const formattedStatus = status.replace(/_/g, ' ');
        return <Badge variant="secondary">{formattedStatus.charAt(0).toUpperCase() + formattedStatus.slice(1).toLowerCase()}</Badge>;
    }
  };

  // --- SIMPLIFIED RENTER CANCEL HANDLER FOR DEBUGGING ---
  const renterSpecificCancelHandler = async (bookingId: string, bookingStartDate: Date | string) => {
    // ----- Log 1: Function Entry -----
    console.log(`RENTER CANCEL: renterSpecificCancelHandler called for bookingId: ${bookingId}`);
    alert(`RENTER CANCEL BOOKING`); // Very obtrusive, but hard to miss

    const pickupTime = new Date(bookingStartDate);
    const now = new Date();
    const hoursToPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    console.log("RENTER CANCEL: Hours to pickup:", hoursToPickup, "Cancellation window:", CANCELLATION_WINDOW_HOURS); // Log 2

    if (hoursToPickup < CANCELLATION_WINDOW_HOURS) {
      toast.error(`Bookings cannot be cancelled within ${CANCELLATION_WINDOW_HOURS} hour(s) of pickup.`);
      console.log("RENTER CANCEL: Cancellation window check FAILED."); // Log 3
      return;
    }
    console.log("RENTER CANCEL: Cancellation window check PASSED."); // Log 4

    const confirmed = window.confirm("Are you sure you want to cancel this booking (Renter)?");
    
    console.log("RENTER CANCEL: User confirmation result:", confirmed); // Log 5
    if (!confirmed) {
      console.log("RENTER CANCEL: Cancellation not confirmed by user."); // Log 6
      return;
    }
    
    setProcessingBookingId(bookingId);
    toast.loading("Renter: Cancelling booking...", { id: `renter-cancelling-${bookingId}` });
    console.log("RENTER CANCEL: Set processing. Calling API..."); // Log 7

    try {
      const response = await fetch(`/api/my-bookings/${bookingId}/cancel`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log("RENTER CANCEL: API response status:", response.status); // Log 8
      
      await response.json();
      // Handle responseData if needed, e.g., show a toast or update state
      toast.success("Booking cancelled successfully.");
      fetchBookings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(`Failed to cancel booking: ${errorMessage}`);
    } finally {
      setProcessingBookingId(null);
      toast.dismiss(`renter-cancelling-${bookingId}`);
    }
  };

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg text-gray-600">Loading your bookings...</p>
      </div>
    );
  }
  if (error && !isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 text-center text-red-600 bg-red-50 p-6 rounded-lg shadow-md">
            <AlertTriangle className="mx-auto h-12 w-12 mb-3"/>
            <p className="font-semibold text-lg mb-1">Oops! Something went wrong.</p>
            <p className="text-sm">{error}</p>
            <Button onClick={fetchBookings} className="mt-4">Try Again</Button>
        </div>
    );
  }

return (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-6">My Bookings</h1>

    <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
            {(['upcoming', 'past', 'all'] as const).map(filter => (
                 <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none
                        ${ activeFilter === filter
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
            ))}
        </nav>
    </div>

    {filteredBookings.length === 0 ? (
      <div className="text-center py-10 bg-white shadow-md rounded-lg p-6">
        <CalendarClock className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {activeFilter === 'upcoming' ? "No upcoming bookings." :
             activeFilter === 'past' ? "No past bookings." :
             "You haven't made any bookings yet."}
        </h2>
        <p className="text-gray-500 mb-6">Ready for an adventure? Find your perfect ride!</p>
        <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
          <Link href="/browse-cars">Browse Cars</Link>
        </Button>
      </div>
    ) : (
      <div className="space-y-6">
        {filteredBookings.map((booking) => {
          const pickupTime = new Date(booking.startDate);
          const now = new Date();
          const hoursToPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          const isCancellableByRenter = 
            ([BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.ON_DELIVERY_PENDING] as BookingStatus[]).includes(booking.status) &&
            hoursToPickup >= CANCELLATION_WINDOW_HOURS;

          // ----- Log 2: Button Rendering Check (inside map) -----
          console.log(`RENDER: Booking ID: ${booking.id} - Status: ${booking.status} - isCancellableByRenter: ${isCancellableByRenter}, processingBookingId: ${processingBookingId}`);

          return (
          <Card key={booking.id} className="shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3">
                {booking.car.images && booking.car.images.length > 0 ? (
                  <Image
                    src={booking.car.images[0]}
                    alt={booking.car.title || `${booking.car.make} ${booking.car.model}`}
                    className="w-full h-48 md:h-full object-cover" // Ensure full height for consistency
                    width={400}
                    height={192}
                    style={{ width: '100%', height: '12rem', objectFit: 'cover' }}
                    priority={true}
                  />
                ) : (
                  <div className="w-full h-48 md:h-full bg-gray-100 flex items-center justify-center">
                    <CarFront className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              <div className="md:col-span-2 flex flex-col justify-between"> {/* justify-between for footer */}
                <div> {/* Wrapper for header and content to allow footer to stick to bottom */}
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <CardTitle className="text-lg sm:text-xl mb-1 sm:mb-0">
                            <Link href={`/cars/${booking.car.id}`} className="hover:text-sky-600 hover:underline">
                                {booking.car.title || `${booking.car.make} ${booking.car.model}`}
                            </Link>
                            <span className="text-sm font-normal text-gray-500 ml-2">({booking.car.year})</span>
                            </CardTitle>
                            {getStatusBadge(booking.status)}
                        </div>
                        <CardDescription className="text-xs text-gray-500">{booking.car.location}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm ">
                        <InfoRow label="Booking ID" value={booking.id.substring(0,8) + '...'} />
                        <InfoRow label="Pickup" value={format(new Date(booking.startDate), "MMM d, yyyy, h:mm a")} />
                        <InfoRow label="Return" value={format(new Date(booking.endDate), "MMM d, yyyy, h:mm a")} />
                        <InfoRow label="Total Price" value={`KES ${booking.totalPrice.toLocaleString()}`} valueClassName="font-semibold text-sky-600"/>
                        {booking.payment && (
                            <InfoRow 
                                label="Payment" 
                                value={`${formatEnumValue(booking.payment.paymentMethod)} - ${formatEnumValue(booking.payment.status)}`} 
                            />
                        )}
                        {booking.notes && <InfoRow label="Notes" value={<span className="italic text-xs">{booking.notes}</span>} />}
                    </CardContent>
                </div>
                <CardFooter className="flex flex-wrap justify-end gap-2 pt-4 border-t bg-slate-50/50 mt-auto"> {/* mt-auto to push footer down */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/bookings/${booking.id}/invoice/download`} target="_blank" download> {/* Corrected link */}
                        <FileText className="mr-1.5 h-3.5 w-3.5"/> Invoice
                    </Link>
                  </Button>
                  {booking.status === BookingStatus.AWAITING_PAYMENT && booking.payment?.paymentMethod !== PrismaPaymentMethod.CASH && (
                    <Button size="sm" onClick={() => router.push(`/checkout/${booking.id}`)} disabled={processingBookingId === booking.id}>
                        {processingBookingId === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShoppingCart className="mr-2 h-4 w-4"/>}
                        Pay Now
                    </Button>
                  )}
                  {isCancellableByRenter && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                            console.log(`RENTER CANCEL BUTTON CLICKED! Booking ID: ${booking.id}`); // Log 3
                            e.stopPropagation();
                            renterSpecificCancelHandler(booking.id, booking.startDate);
                        }}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400"
                        disabled={processingBookingId === booking.id}
                    >
                      {processingBookingId === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}
                      Cancel Booking
                    </Button>
                  )}
                  {booking.status === BookingStatus.COMPLETED && !booking.review && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/leave-review/${booking.id}`}>
                            <Star className="mr-2 h-4 w-4"/> Leave Review
                        </Link>
                    </Button>
                  )}
                  {/* Remove this generic details button if you have invoice/pay now etc. Or keep for specific detail page */}
                  {/* <Button variant="ghost" size="sm" asChild>
                    <Link href={`/bookings/${booking.id}/details`}> 
                      View Details
                    </Link>
                  </Button> */}
                </CardFooter>
              </div>
            </div>
          </Card>
        )})}
      </div>
    )}
  </div>
);
}

// Helper to format enum values for display
function formatEnumValue(value: string | null | undefined): string {
    if (!value) return '';
    return value
        .toString()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
}

// Helper component for rows in CardContent
const InfoRow = ({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) => (
    <div className="flex justify-between items-baseline">
        <dt className="font-medium text-gray-600 whitespace-nowrap text-xs">{label}:</dt>
        <dd className={`text-gray-700 text-right ml-2 text-xs ${valueClassName}`}>{value}</dd>
    </div>
);