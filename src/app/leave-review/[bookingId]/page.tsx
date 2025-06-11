"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Booking, BookingStatus } from '@prisma/client';
// Star Rating Component (simple example, you might use a library)
const StarRating = ({ rating, setRating, disabled = false }: { rating: number; setRating: (rating: number) => void; disabled?: boolean }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} ${!disabled ? 'hover:text-yellow-300' : ''}`}
          onClick={() => !disabled && setRating(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
};

interface BookingForReview extends Omit<Booking, 'car' | 'user' | 'payment' | 'review'> {
    car: { id: string; title: string | null; make: string; model: string; images: string[] };
    user: { id: string }; // Only need user ID for verification
    status: BookingStatus;
    review: { id: string } | null;
}


export default function LeaveReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const bookingId = params?.bookingId as string;

  const [bookingDetails, setBookingDetails] = useState<BookingForReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
        router.push(`/auth/login?callbackUrl=/leave-review/${bookingId}`);
        return;
    }

    const fetchBookingDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Need an API to fetch a single booking's details for review eligibility
            // For now, we assume the /api/my-bookings might be adapted or a new one created
            // Let's create a temporary API endpoint or use one if available.
            // For simplicity here, let's assume we can fetch it:
            // const response = await fetch(`/api/bookings/${bookingId}/details-for-review`);
            // This would be ideal. As a fallback, if we don't have that specific endpoint yet:
            const response = await fetch('/api/my-bookings'); // Fetch all and find
            if (!response.ok) throw new Error("Failed to fetch booking details.");
            const allBookings: BookingForReview[] = await response.json();
            const targetBooking = allBookings.find(b => b.id === bookingId);

            if (!targetBooking) throw new Error("Booking not found or not yours.");
            if (targetBooking.userId !== session?.user.id) throw new Error("You are not authorized to review this booking.");
            if (targetBooking.status !== BookingStatus.COMPLETED) throw new Error("Review can only be left for completed bookings.");
            if (targetBooking.review) throw new Error("Review already submitted for this booking.");

            setBookingDetails(targetBooking);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    fetchBookingDetails();
  }, [bookingId, sessionStatus, session, router]);


  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit review.");
      setSuccess("Thank you! Your review has been submitted.");
      setTimeout(() => router.push(`/cars/${bookingDetails?.car.id}`), 2000); // Redirect to car page
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || sessionStatus === 'loading') return <div className="text-center py-10">Loading review form...</div>;
  if (error && !bookingDetails) return <div className="text-center py-10 text-red-500">Error: {error} <br/> <Link href="/my-bookings" className="text-blue-600 hover:underline">Go to My Bookings</Link></div>;
  if (!bookingDetails) return <div className="text-center py-10">Booking information not found or not eligible for review.</div>;


  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Leave a Review</h1>
      <p className="text-gray-600 mb-1">For your booking of: <Link href={`/cars/${bookingDetails.car.id}`} className="text-blue-600 hover:underline font-semibold">{bookingDetails.car.title || `${bookingDetails.car.make} ${bookingDetails.car.model}`}</Link></p>
      <p className="text-xs text-gray-500 mb-6">Booking ID: {bookingDetails.id.substring(0,12)}...</p>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{success}</div>}

      <form onSubmit={handleSubmitReview} className="bg-white p-6 rounded-lg shadow-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating <span className="text-red-500">*</span></label>
          <StarRating rating={rating} setRating={setRating} disabled={isSubmitting || !!success} />
        </div>
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Your Comments (Optional)</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="input-form w-full"
            placeholder="Share your experience with the car and the owner..."
            disabled={isSubmitting || !!success}
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || rating === 0 || !!success}
          className="w-full btn-primary disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}