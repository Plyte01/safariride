/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Car, User, Review as PrismaReview, Booking as PrismaBooking, UserRole } from '@prisma/client';
import { FiArrowLeft, FiEdit2, FiCalendar, FiStar, FiUser, FiList, FiPower, FiShield, FiMapPin, FiInfo, FiImage, FiFileText } from 'react-icons/fi'; // More icons

// Extended types for included relations
interface ReviewWithUser extends PrismaReview {
  user: Pick<User, 'id' | 'name' | 'image'>;
}
interface BookingWithUser extends PrismaBooking {
  user: Pick<User, 'id' | 'name' | 'email'>; // Renter
}
interface AdminCarDetailsView extends Car {
  owner: Pick<User, 'id' | 'name' | 'email' | 'image' | 'phoneNumber' | 'phoneVerified'> | null;
  reviews: ReviewWithUser[];
  bookings: BookingWithUser[];
}

// Helper components for display
const DetailSection = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
      {icon && <span className="mr-2 text-gray-500">{icon}</span>}
      {title}
    </h2>
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">{children}</div>
  </div>
);

const InfoPair = ({ label, value, valueClassName = "text-gray-800" }: { label: string; value: React.ReactNode; valueClassName?: string }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
    <p className={`text-sm ${valueClassName}`}>{value || 'N/A'}</p>
  </div>
);

const StatusIndicator = ({ status, activeText = "Active", inactiveText = "Inactive", icon }: { status: boolean; activeText?: string; inactiveText?: string; icon?: React.ReactNode }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {icon && <span className="mr-1">{icon}</span>}
    {status ? activeText : inactiveText}
  </span>
);

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


export default function AdminCarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const carId = params?.carId as string;

  const [car, setCar] = useState<AdminCarDetailsView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ... (session and admin role check as in other admin pages, redirect if fail) ...
    if (sessionStatus === 'loading' || !carId) return;
    if (sessionStatus === 'unauthenticated' || (session && (session.user as any).role !== UserRole.ADMIN)) {
        router.replace('/admin?error=unauthorized_access'); return;
    }

    const fetchCarDetails = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/admin/cars/${carId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Car not found or failed to fetch details." }));
          throw new Error(errData.message);
        }
        setCar(await response.json());
      } catch (err: any) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    fetchCarDetails();
  }, [carId, sessionStatus, session, router]);

  const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatEnum = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';


  if (isLoading || sessionStatus === 'loading') return <div className="text-center py-20"><p className="text-xl">Loading car details...</p></div>; // Add skeleton loader
  if (error) return <div className="text-center py-20 text-red-500">Error: {error} <br/> <Link href="/admin/cars" className="text-blue-600 hover:underline">Back to Car List</Link></div>;
  if (!car) return <div className="text-center py-20">Car not found. <br/> <Link href="/admin/cars" className="text-blue-600 hover:underline">Back to Car List</Link></div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link href="/admin/cars" className="inline-flex items-center text-blue-600 hover:text-blue-800 group text-sm">
          <FiArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Car List
        </Link>
        <Link href={`/admin/cars/${car.id}/edit`} className="btn-secondary py-2 px-3 text-sm flex items-center">
            <FiEdit2 className="mr-1.5 h-4 w-4"/> Edit Car
        </Link>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header Section with Image and Title */}
        <div className="md:flex">
            <div className="md:w-1/2">
                {car.images && car.images.length > 0 ? (
                    <Image src={car.images[0]} alt={car.title || "Car image"} className="w-full h-64 md:h-full object-cover"/>
                ) : (
                    <div className="w-full h-64 md:h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        <FiImage className="h-16 w-16"/>
                    </div>
                )}
            </div>
            <div className="p-6 md:p-8 md:w-1/2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{car.title || `${car.make} ${car.model}`}</h1>
                <p className="text-sm text-gray-500 mb-3">ID: {car.id}</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
                    <InfoPair label="Make" value={car.make} />
                    <InfoPair label="Model" value={car.model} />
                    <InfoPair label="Year" value={car.year} />
                    <InfoPair label="Category" value={formatEnum(car.category)} />
                    <InfoPair label="Price/Day" value={`KES ${car.pricePerDay.toLocaleString()}`} valueClassName="font-semibold text-blue-600"/>
                    {car.pricePerHour !== null && <InfoPair label="Price/Hour" value={`KES ${car.pricePerHour.toLocaleString()}`} valueClassName="font-semibold text-blue-600"/>}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    <StatusIndicator status={car.isVerified} activeText="Verified" inactiveText="Not Verified" icon={<FiShield/>} />
                    <StatusIndicator status={car.isListed} activeText="Listed" inactiveText="Not Listed" icon={<FiList/>} />
                    <StatusIndicator status={car.isActive} activeText="Active" inactiveText="Inactive" icon={<FiPower/>} />
                </div>
                <Link href={`/cars/${car.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View Public Page →</Link>
            </div>
        </div>
        
        <div className="p-6 md:p-8 border-t border-gray-200">
            <DetailSection title="Full Specifications" icon={<FiInfo />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <InfoPair label="Color" value={car.color} />
                    <InfoPair label="License Plate" value={car.licensePlate} />
                    <InfoPair label="Transmission" value={formatEnum(car.transmission)} />
                    <InfoPair label="Fuel Type" value={formatEnum(car.fuelType)} />
                    <InfoPair label="Seats" value={car.seats} />
                    <InfoPair label="Avg. Rating" value={<><RenderStars rating={car.averageRating} /> ({car.totalRatings} reviews)</>} />
                </div>
                {car.features && car.features.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Features</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {car.features.map(f => <span key={f} className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{f}</span>)}
                        </div>
                    </div>
                )}
            </DetailSection>

            <DetailSection title="Location & Availability" icon={<FiMapPin />}>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <InfoPair label="General Location" value={car.location} />
                    <InfoPair label="Latitude" value={car.latitude} />
                    <InfoPair label="Longitude" value={car.longitude} />
                    <InfoPair label="Generally Available From" value={car.availableFrom ? formatTimestamp(car.availableFrom) : "Not Set"} />
                    <InfoPair label="Generally Available To" value={car.availableTo ? formatTimestamp(car.availableTo) : "Not Set"} />
                 </div>
            </DetailSection>
            
            <DetailSection title="Description" icon={<FiFileText />}>
                <p className="text-sm text-gray-700 whitespace-pre-line">{car.description}</p>
            </DetailSection>

            {car.owner && (
                <DetailSection title="Owner Information" icon={<FiUser />}>
                    <div className="flex items-center space-x-3">
                        <Image src={car.owner.image || '/default-avatar.png'} alt={car.owner.name || ""} className="h-10 w-10 rounded-full object-cover"/>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{car.owner.name}</p>
                            <p className="text-xs text-gray-500">{car.owner.email}</p>
                            {car.owner.phoneNumber && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {car.owner.phoneNumber}
                                    {car.owner.phoneVerified ? (
                                        <span className="ml-1 text-green-600">✓ Verified</span>
                                    ) : (
                                        <span className="ml-1 text-orange-600">⚠ Not Verified</span>
                                    )}
                                </p>
                            )}
                        </div>
                        <Link href={`/admin/users/${car.owner.id}/details`} className="text-xs text-blue-500 hover:underline ml-auto">View Owner Profile</Link>
                    </div>
                </DetailSection>
            )}

            <DetailSection title="Recent Bookings" icon={<FiCalendar />}>
                {car.bookings && car.bookings.length > 0 ? (
                    <ul className="divide-y divide-slate-200">
                        {car.bookings.map(booking => (
                            <li key={booking.id} className="py-2 text-xs">
                                <Link href={`/admin/bookings/${booking.id}/details`} className="text-blue-600 hover:underline">ID: {booking.id.substring(0,8)}...</Link> | 
                                Renter: {booking.user.name || booking.user.email} | 
                                Dates: {formatTimestamp(booking.startDate)} - {formatTimestamp(booking.endDate)} | 
                                Status: <span className="font-medium">{formatEnum(booking.status)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500">No recent bookings found for this car.</p>}
                 <Link href={`/admin/bookings?carId=${car.id}`} className="text-xs text-blue-500 hover:underline mt-2 block">View All Bookings for this Car →</Link>
            </DetailSection>

            <DetailSection title="Recent Reviews" icon={<FiStar />}>
                 {car.reviews && car.reviews.length > 0 ? (
                    <ul className="space-y-3">
                        {car.reviews.map(review => (
                            <li key={review.id} className="text-xs border-b border-slate-100 pb-2 last:border-b-0">
                                <div className="flex items-center mb-0.5"><RenderStars rating={review.rating}/> <span className="ml-2 text-gray-600">by {review.user.name || 'Anonymous'}</span></div>
                                {review.comment && <p className="text-gray-700 italic">&quot;{review.comment}&quot;</p>}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500">No reviews yet for this car.</p>}
                 <Link href={`/admin/reviews?carId=${car.id}`} className="text-xs text-blue-500 hover:underline mt-2 block">View All Reviews for this Car →</Link>
            </DetailSection>
        </div>
      </div>
    </div>
  );
}