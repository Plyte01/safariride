// src/app/cars/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Car, PaymentMethod as PrismaPaymentMethod } from '@prisma/client'; // Ensure all used enums/types are imported
import { useSession } from 'next-auth/react';
import "react-datepicker/dist/react-datepicker.css";

// Interface for the car details we expect to display, including owner info
interface CarDetails extends Car { // 'Car' is directly from Prisma
  owner: {
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    phoneVerified: boolean;
  } | null;
}

// Interface for booked date intervals from the API

export default function CarDetailPage() {
  const params = useParams();
  const carId = params?.id as string;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [car, setCar] = useState<CarDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null); // For errors fetching car details
  const [bookingError, setBookingError] = useState<string | null>(null); // For errors during booking
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Booking form state
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today for min date comparison
  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD for min date in input

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrismaPaymentMethod>(PrismaPaymentMethod.CASH);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  // const [bookedDateIntervals, setBookedDateIntervals] = useState<BookedInterval[]>([]);

  // Effect to fetch car details
  useEffect(() => {
    if (!carId) {
      setPageError("Car ID not found in URL.");
      setIsLoading(false);
      return;
    }
    const fetchCarDetails = async () => {
      setIsLoading(true);
      setPageError(null);
      try {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('Car not found.');
          const errorData = await response.json().catch(() => ({ message: `Failed to fetch car details` }));
          throw new Error(errorData.message || `Failed to fetch car details: ${response.statusText}`);
        }
        const data: CarDetails = await response.json();
        setCar(data);
        // Pre-fill pickup/return location if car has a primary location
        if (data.location) {
            setPickupLocation(data.location);
            setReturnLocation(data.location);
        }
      } catch (err: unknown) {
        console.error(err);
        if (err instanceof Error) {
          setPageError(err.message || 'Could not load car details.');
        } else {
          setPageError('Could not load car details.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCarDetails();
  }, [carId]);

  // Fetch car availability (booked dates)
  // (Removed bookedDateIntervals usage as it was unused)
  useEffect(() => {
    if (!carId) return;
    const fetchAvailability = async () => {
      try {
        const response = await fetch(`/api/availability/cars/${carId}`);
        if (!response.ok) {
          console.error("Failed to fetch car availability");
          return;
        }
        // Data is fetched but not used since bookedDateIntervals is removed
        // const data: { start: string; end: string }[] = await response.json();
      } catch (error) {
        console.error("Error fetching availability:", error);
      }
    };
    fetchAvailability();
  }, [carId]);

  // Effect for dynamic price calculation
  useEffect(() => {
    if (car && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start < end) { // Ensure end date is after start date
        const diffTime = Math.abs(end.getTime() - start.getTime());
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // If less than a day but some time passed, count as 1 day for daily rate
        if (diffDays === 0 && diffTime > 0) {
          diffDays = 1;
        }
        const price = (diffDays > 0 ? diffDays : 0) * car.pricePerDay;
        setCalculatedPrice(price > 0 ? price : null);
      } else {
        setCalculatedPrice(null); // Invalid date range
      }
    } else {
      setCalculatedPrice(null);
    }
  }, [startDate, endDate, car]);

  // Booking submission handler
  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sessionStatus === 'loading') {
        setBookingError("Session still loading, please wait.");
        return;
    }
    if (!session) {
      router.push(`/auth/login?callbackUrl=/cars/${carId}`);
      return;
    }
    if (!startDate || !endDate || !pickupLocation || !returnLocation) {
      setBookingError("Please fill in all required date and location fields.");
      return;
    }
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    sDate.setHours(0,0,0,0); // Compare date part only for past check
    if (sDate < today) {
        setBookingError("Pickup date cannot be in the past.");
        return;
    }
    if (sDate >= eDate) {
      setBookingError("Return date must be after pickup date.");
      return;
    }
    if (!calculatedPrice || calculatedPrice <= 0) {
        setBookingError("Invalid booking duration or price. Please check dates.");
        return;
    }


    setIsBooking(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      // Include time in ISO string for backend (e.g., assume pickup at 9 AM, return at 5 PM)
      // For simplicity, we'll send just the date, backend can assume default times or you can add time inputs
      const bookingStartDate = new Date(startDate);
      bookingStartDate.setHours(9,0,0,0); // Example: Default pickup time 9 AM
      const bookingEndDate = new Date(endDate);
      bookingEndDate.setHours(17,0,0,0); // Example: Default return time 5 PM

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          startDate: bookingStartDate.toISOString(),
          endDate: bookingEndDate.toISOString(),
          pickupLocation,
          returnLocation,
          paymentMethod: selectedPaymentMethod,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create booking.");
      }

      setBookingSuccess(`Booking request submitted! Booking ID: ${data.id}. Check 'My Bookings' for status and next steps.`);
      setStartDate('');
      setEndDate('');
      setPickupLocation(car?.location || '');
      setReturnLocation(car?.location || '');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setBookingError(err.message || "An error occurred while booking.");
      } else {
        setBookingError("An error occurred while booking.");
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Image gallery navigation
  const nextImage = () => {
    if (car && car.images && car.images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % car.images.length);
    }
  };
  const prevImage = () => {
    if (car && car.images && car.images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + car.images.length) % car.images.length);
    }
  };

  // Render logic
  if (isLoading && !car) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">Loading car details...</p></div>;
  }

  if (pageError && !car) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-red-500">Error: {pageError}</p></div>;
  }

  if (!car) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">Car not found.</p></div>;
  }

  // Helper to format enum values for display
  const formatEnum = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="lg:flex lg:space-x-8">
        {/* Left Column: Car Information & Images */}
        <div className="lg:w-2/3">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Image Gallery */}
            {car.images && car.images.length > 0 ? (
              <div className="relative">
                <Image
                  src={car.images[currentImageIndex]}
                  alt={`${car.make} ${car.model} - Image ${currentImageIndex + 1}`}
                  width={1200}
                  height={600}
                  className="w-full h-64 md:h-96 object-cover transition-opacity duration-300"
                  priority={currentImageIndex === 0}
                  sizes="(max-width: 768px) 100vw, 66vw"
                  style={{ width: '100%', height: 'auto' }}
                />
                {car.images.length > 1 && (
                  <>
                    <button onClick={prevImage} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                      ❮
                    </button>
                    <button onClick={nextImage} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                      ❯
                    </button>
                  </>
                )}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} / {car.images.length}
                </div>
              </div>
            ) : (
              <div className="w-full h-64 md:h-96 bg-gray-200 flex items-center justify-center text-gray-400">
                No Images Available
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="md:flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                    {car.title || `${car.make} ${car.model}`}
                  </h1>
                  <p className="text-md text-gray-500 mt-1">{car.year} • {car.location}</p>
                </div>
                <div className="mt-4 md:mt-0 text-left md:text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    KES {car.pricePerDay.toLocaleString()}/day
                  </p>
                  {car.pricePerHour != null && car.pricePerHour > 0 && (
                  <p className="text-sm text-gray-500">
                    KES {car.pricePerHour.toLocaleString()}/hour
                  </p>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Vehicle Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <p><strong>Make:</strong> {car.make}</p>
                  <p><strong>Model:</strong> {car.model}</p>
                  <p><strong>Category:</strong> {formatEnum(car.category)}</p>
                  <p><strong>Transmission:</strong> {formatEnum(car.transmission)}</p>
                  <p><strong>Fuel Type:</strong> {formatEnum(car.fuelType)}</p>
                  <p><strong>Seats:</strong> {car.seats}</p>
                  <p><strong>Color:</strong> {car.color}</p>
                  {car.licensePlate && <p><strong>License:</strong> {car.licensePlate}</p>}
                </div>
              </div>

              {car.features && car.features.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h2 className="text-xl font-semibold text-gray-700 mb-3">Features</h2>
                  <ul className="list-disc list-inside grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                    {car.features.map((feature, index) => (
                      <li key={index} className="text-gray-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Description</h2>
                <p className="text-gray-600 whitespace-pre-line">{car.description}</p>
              </div>

              {car.owner && (
                <div className="mt-6 border-t pt-6">
                  <h2 className="text-xl font-semibold text-gray-700 mb-3">Owner Information</h2>
                  <p className="text-gray-600"><strong>Listed by:</strong> {car.owner.name || 'N/A'}</p>
                  {car.owner.phoneNumber && (
                    <p className="text-gray-600 mt-1">
                      <strong>Phone:</strong> {car.owner.phoneNumber}
                      {car.owner.phoneVerified ? (
                        <span className="ml-1 text-green-600">✓ Verified</span>
                      ) : (
                        <span className="ml-1 text-orange-600">⚠ Not Verified</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Booking Form */}
        <div className="lg:w-1/3 mt-8 lg:mt-0">
          <div className="bg-white shadow-xl rounded-lg p-6 sticky top-8"> {/* Sticky for desktop scroll */}
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">Request to Book</h2>

            {sessionStatus === 'unauthenticated' && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm">
                Please <Link href={`/auth/login?callbackUrl=/cars/${carId}`} className="font-bold hover:underline">login</Link> or <Link href={`/auth/signup?callbackUrl=/cars/${carId}`} className="font-bold hover:underline">sign up</Link> to book this car.
              </div>
            )}
            
            {bookingError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {bookingError}
              </div>
            )}
            {bookingSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-sm">
                {bookingSuccess}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Pickup Date</label>
                <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={todayISO} required className="input-field"/>
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Return Date</label>
                <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || todayISO} required className="input-field"/>
              </div>
              <div>
                <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700">Pickup Location</label>
                <input type="text" id="pickupLocation" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} required className="input-field" placeholder={car.location || "e.g., Airport Terminal 1"}/>
              </div>
              <div>
                <label htmlFor="returnLocation" className="block text-sm font-medium text-gray-700">Return Location</label>
                <input type="text" id="returnLocation" value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} required className="input-field" placeholder={car.location || "e.g., Downtown Office"}/>
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select id="paymentMethod" value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value as PrismaPaymentMethod)} required className="select-field">
                  <option value={PrismaPaymentMethod.CASH}>Cash on Delivery</option>
                  <option value={PrismaPaymentMethod.MPESA} disabled>M-Pesa (Coming Soon)</option>
                  <option value={PrismaPaymentMethod.CREDIT_CARD} disabled>Credit Card (Coming Soon)</option>
                  <option value={PrismaPaymentMethod.DEBIT_CARD} disabled>Debit Card (Coming Soon)</option>
                  <option value={PrismaPaymentMethod.PAYPAL} disabled>PayPal (Coming Soon)</option>
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Additional Notes (Optional)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field" placeholder="e.g., Flight number for airport pickup, child seat needed."></textarea>
              </div>

              {calculatedPrice !== null && calculatedPrice > 0 && (
                <div className="pt-2 text-xl font-semibold text-gray-800">
                  Estimated Total: KES {calculatedPrice.toLocaleString()}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isBooking || sessionStatus === 'loading' || !session || !calculatedPrice || calculatedPrice <= 0}
                  className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isBooking ? 'Submitting Request...' : 'Request to Book'}
                </button>
              </div>
              {!car.isActive && <p className="text-sm text-center text-red-500 mt-2">This car is currently not active for bookings.</p>}
              {!car.isVerified && <p className="text-sm text-center text-yellow-600 mt-2">This car is pending verification.</p>}
            </form>
          </div>
        </div>
      </div>

      {/* Placeholder for Reviews Section - To be implemented later */}
      <div className="mt-12 pt-8 border-t">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Customer Reviews</h2>
        {/* Map through car.reviews when available */}
        <p className="text-gray-500">No reviews yet for this car. Be the first to leave one after your trip!</p>
      </div>
    </div>
  );
}

// Add to your src/app/globals.css or a dedicated CSS module:
