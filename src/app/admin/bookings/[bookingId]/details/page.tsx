/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
    Booking, Car, User, Payment, Review as PrismaReview, 
    UserRole, CarCategory, TransmissionType, FuelType, 
    BookingStatus, PaymentMethod as PrismaPaymentMethod, PaymentStatus as PrismaPaymentStatus
} from '@prisma/client';
import { 
    FiArrowLeft, FiCalendar, FiClock, FiUser, FiUsers, FiBox, FiDollarSign, FiCreditCard, FiEdit2, 
    FiMessageSquare, FiStar, FiFileText, FiMapPin, FiAlertTriangle, FiCheckCircle, FiXCircle,
    FiThumbsUp, FiThumbsDown, FiArchive // Example icons for actions
} from 'react-icons/fi';

// Extended types for included relations
interface ReviewWithUser extends PrismaReview {
  user: Pick<User, 'id' | 'name' | 'image'>;
}
interface CarWithDetails extends Car {
    owner: Pick<User, 'id' | 'name' | 'email' | 'image'>;
}
interface RenterDetails extends User {} // Full user model for renter is fine here

interface AdminBookingDetailsView extends Omit<Booking, 'car' | 'user' | 'payment' | 'review'> {
  car: CarWithDetails;
  user: RenterDetails; // Renter
  payment: Payment | null;
  review: ReviewWithUser | null;
}

// Helper Components (can be moved to shared utils)
const DetailSection = ({ title, children, icon, initiallyOpen = true }: { title: string; children: React.ReactNode; icon?: React.ReactNode; initiallyOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    return (
        <div className="mb-6 border border-slate-200 rounded-lg shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg focus:outline-none"
            >
                <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                    {icon && <span className="mr-2.5 text-gray-500">{icon}</span>}
                    {title}
                </h2>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
            </button>
            {isOpen && <div className="p-4 space-y-3 bg-white rounded-b-lg">{children}</div>}
        </div>
    );
};
const InfoPair = ({ label, value, valueClassName = "text-gray-800", isFullWidth = false }: { label: string; value: React.ReactNode; valueClassName?: string; isFullWidth?: boolean }) => (
    <div className={`py-2 ${isFullWidth ? '' : 'sm:grid sm:grid-cols-3 sm:gap-4'}`}>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className={`mt-1 text-sm sm:mt-0 ${isFullWidth ? '' : 'sm:col-span-2'} ${valueClassName}`}>{value || <span className="italic text-gray-400">N/A</span>}</dd>
    </div>
);
const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
const formatEnum = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
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
const getPaymentStatusColor = (status: PrismaPaymentStatus): string => { /* similar logic for payment status colors */ return ""; };
const RenderStars = ({ rating }: { rating: number }) => {
  // Renders 5 stars, filled according to rating (can be fractional)
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FiStar key={i} className="inline text-yellow-400" />);
    } else if (rating > i - 1 && rating < i) {
      stars.push(<FiStar key={i} className="inline text-yellow-300 opacity-70" />);
    } else {
      stars.push(<FiStar key={i} className="inline text-gray-300" />);
    }
  }
  return <span>{stars}</span>;
};


export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const bookingId = params?.bookingId as string;

  const [booking, setBooking] = useState<AdminBookingDetailsView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for managing status update modal (if implementing actions here)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);


  useEffect(() => {
    // ... (session and admin role check) ...
    if (sessionStatus === 'loading' || !bookingId) return;
    if (sessionStatus === 'unauthenticated' || (session && (session.user as any).role !== UserRole.ADMIN)) {
        router.replace('/admin?error=unauthorized_access'); return;
    }

    const fetchBookingDetails = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Booking not found or failed to fetch details." }));
          throw new Error(errData.message);
        }
        setBooking(await response.json());
      } catch (err: any) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    fetchBookingDetails();
  }, [bookingId, sessionStatus, session, router]);

  const handleStatusUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStatus || !booking) return;
    setIsUpdatingStatus(true);
    try {
        const response = await fetch(`/api/admin/bookings/${booking.id}`, { // Using the general update PATCH
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, notes: adminNotes }),
        });
        const updatedBookingData = await response.json();
        if (!response.ok) throw new Error(updatedBookingData.message || "Failed to update booking status.");
        
        setBooking(updatedBookingData); // Update local state
        setShowStatusModal(false);
        setAdminNotes('');
        alert("Booking status updated successfully!");
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setIsUpdatingStatus(false);
    }
  };


  if (isLoading || sessionStatus === 'loading') return <div className="text-center py-20"><p className="text-xl">Loading booking details...</p></div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error} <br/> <Link href="/admin/bookings" className="text-blue-600 hover:underline">Back to Bookings List</Link></div>;
  if (!booking) return <div className="text-center py-20">Booking not found. <br/> <Link href="/admin/bookings" className="text-blue-600 hover:underline">Back to Bookings List</Link></div>;


  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link href="/admin/bookings" className="inline-flex items-center text-blue-600 hover:text-blue-800 group text-sm">
          <FiArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Bookings List
        </Link>
        <button onClick={() => { setNewStatus(booking.status); setShowStatusModal(true); }} className="btn-secondary py-2 px-3 text-sm flex items-center">
            <FiEdit2 className="mr-1.5 h-4 w-4"/> Manage Status
        </button>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-gray-800">Booking ID: {booking.id}</h1>
            <div className="mt-1">
                <span className={`status-badge text-sm ${getBookingStatusColor(booking.status)}`}>
                    {formatEnum(booking.status)}
                </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Created: {formatTimestamp(booking.createdAt)} | Last Updated: {formatTimestamp(booking.updatedAt)}</p>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1: Booking & Car Details */}
            <div className="lg:col-span-2 space-y-6">
                <DetailSection title="Booking Schedule & Location" icon={<FiCalendar />} initiallyOpen={true}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoPair label="Pickup Date & Time" value={formatTimestamp(booking.startDate)} />
                        <InfoPair label="Return Date & Time" value={formatTimestamp(booking.endDate)} />
                        <InfoPair label="Pickup Location" value={booking.pickupLocation} isFullWidth={true}/>
                        <InfoPair label="Return Location" value={booking.returnLocation} isFullWidth={true}/>
                    </div>
                </DetailSection>

                <DetailSection title="Car Details" icon={<FiBox />}>
                    <div className="flex items-center space-x-4 mb-3">
                        <img src={booking.car.images?.[0] || '/placeholder-car.svg'} alt={booking.car.title || "Car"} className="h-16 w-24 object-cover rounded-md"/>
                        <div>
                            <Link href={`/admin/cars/${booking.car.id}/details`} className="font-semibold text-blue-600 hover:underline">{booking.car.title || `${booking.car.make} ${booking.car.model}`}</Link>
                            <p className="text-xs text-gray-500">{booking.car.make} {booking.car.model} ({booking.car.year})</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <InfoPair label="Category" value={formatEnum(booking.car.category)} />
                        <InfoPair label="Transmission" value={formatEnum(booking.car.transmission)} />
                        <InfoPair label="Owner" value={<Link href={`/admin/users/${booking.car.owner.id}/details`} className="text-blue-500 hover:underline">{booking.car.owner.name || booking.car.owner.email}</Link>} />
                    </div>
                </DetailSection>

                {booking.notes && (
                    <DetailSection title="Renter Notes" icon={<FiMessageSquare />}>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{booking.notes}</p>
                    </DetailSection>
                )}
            </div>

            {/* Column 2: Renter & Payment Details */}
            <div className="lg:col-span-1 space-y-6">
                <DetailSection title="Renter Information" icon={<FiUsers />} initiallyOpen={true}>
                    <div className="flex items-center space-x-3">
                        <img src={booking.user.image || '/default-avatar.png'} alt={booking.user.name || ""} className="h-12 w-12 rounded-full object-cover"/>
                        <div>
                            <Link href={`/admin/users/${booking.user.id}/details`} className="font-semibold text-blue-600 hover:underline">{booking.user.name || 'Unnamed Renter'}</Link>
                            <p className="text-xs text-gray-500">{booking.user.email}</p>
                            <p className="text-xs text-gray-500">Role: {formatEnum(booking.user.role)}</p>
                        </div>
                    </div>
                </DetailSection>

                <DetailSection title="Payment Details" icon={<FiDollarSign />}>
                    <InfoPair label="Total Price" value={`KES ${booking.totalPrice.toLocaleString()}`} valueClassName="font-bold text-lg"/>
                    {booking.payment ? (
                        <>
                            <InfoPair label="Payment Method" value={formatEnum(booking.payment.paymentMethod)} />
                            <InfoPair label="Payment Status" value={<span className={`font-medium ${getPaymentStatusColor(booking.payment.status)}`}>{formatEnum(booking.payment.status)}</span>} />
                            <InfoPair label="Payment Type" value={formatEnum(booking.payment.paymentType)} />
                            <InfoPair label="Transaction ID" value={booking.payment.transactionId} />
                            <InfoPair label="Payment Record ID" value={booking.payment.id.substring(0,12)+'...'} />
                             {/* TODO: Add button to "Mark as Paid" for CASH if payment status is PENDING */}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">No payment record associated with this booking yet.</p>
                    )}
                </DetailSection>
                
                {booking.review && (
                    <DetailSection title="Review Submitted" icon={<FiStar />}>
                        <div className="flex items-center mb-1"><RenderStars rating={booking.review.rating}/></div>
                        <p className="text-xs text-gray-500 mb-1.5">By: <Link href={`/admin/users/${booking.review.user.id}/details`} className="text-blue-500 hover:underline">{booking.review.user.name || 'Anonymous'}</Link></p>
                        {booking.review.comment && <p className="text-sm text-gray-700 italic bg-slate-100 p-2 rounded">"{booking.review.comment}"</p>}
                    </DetailSection>
                )}
            </div>
        </div>
      </div>

      {/* Manage Status Modal */}
      {showStatusModal && booking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={() => setShowStatusModal(false)}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Update Booking Status</h3>
                <p className="text-sm mb-1">Current Status: <span className={`font-medium ${getBookingStatusColor(booking.status)}`}>{formatEnum(booking.status)}</span></p>
                <form onSubmit={handleStatusUpdate}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="newStatus" className="label-form">New Status <span className="text-red-500">*</span></label>
                            <select id="newStatus" value={newStatus} onChange={(e) => setNewStatus(e.target.value as BookingStatus)} required className="select-form w-full">
                                <option value="" disabled>Select new status</option>
                                {Object.values(BookingStatus).map(s => <option key={s} value={s}>{formatEnum(s)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="adminNotes" className="label-form">Admin Notes (Optional, will be appended)</label>
                            <textarea id="adminNotes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} className="input-form w-full" placeholder="Reason for change..."></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setShowStatusModal(false)} className="btn-secondary py-2 px-4" disabled={isUpdatingStatus}>Cancel</button>
                        <button type="submit" disabled={isUpdatingStatus || !newStatus} className="btn-primary py-2 px-4 disabled:opacity-50">
                            {isUpdatingStatus ? "Saving..." : "Update Status"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}