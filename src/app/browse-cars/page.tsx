// src/app/browse-cars/page.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Car, CarCategory } from '@prisma/client'; // Ensure all necessary types are imported
import { FiStar, FiImage, FiMapPin, FiCalendar } from 'react-icons/fi'; // Example icons

// Define a more specific type for the car data we expect from the API
interface CarForBrowse extends Omit<Car, 'owner'> { // Using Omit to replace owner with a simpler type
  images: string[]; // Changed from imageUrls
  averageRating: number;
  totalRatings: number;
  category: CarCategory; // Ensure this is part of the fetched data
  owner: {
    name: string | null;
    // email?: string | null; // Only if needed on the card
  } | null;
}

// Helper to render stars (can be a shared component)
const RenderStars = ({ rating, totalRatings }: { rating: number; totalRatings: number }) => {
    const totalStarIcons = 5;
    const fullStars = Math.round(rating); // Or Math.floor(rating)
    
    if (totalRatings === 0) {
        return <span className="text-xs text-gray-500">No ratings yet</span>;
    }

    return (
        <div className="flex items-center">
        {[...Array(totalStarIcons)].map((_, i) => (
            <FiStar key={i} className={`w-3.5 h-3.5 ${i < fullStars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        ))}
        {rating > 0 && <span className="ml-1.5 text-xs text-gray-600">{rating.toFixed(1)} ({totalRatings})</span>}
        </div>
    );
};

// Helper to format enum values for display
const formatEnum = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';


export default function BrowseCarsPage() {
  const [cars, setCars] = useState<CarForBrowse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCars = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Add query params for filters/sorting when implemented
        const response = await fetch('/api/cars'); 
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({message: "Failed to fetch cars."}));
          throw new Error(errorData.message || `Failed to fetch cars: ${response.statusText}`);
        }
        const data: CarForBrowse[] = await response.json();
        setCars(data);
      } catch (err: unknown) {
        console.error("Fetch cars error:", err);
        if (err instanceof Error) {
          setError(err.message || 'Could not load cars.');
        } else {
          setError('Could not load cars.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCars();
  }, []);

  if (isLoading) {
    // Skeleton Loader for Cards
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Discover Your Next Ride</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="w-full h-56 bg-gray-300"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-8 bg-gray-300 rounded w-1/4 mt-2"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-red-600">
        <h2 className="text-2xl font-semibold mb-2">Oops! Something went wrong.</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 btn-primary py-2 px-4 text-sm">Try Again</button>
    </div>;
  }

  if (cars.length === 0) {
    return <div className="text-center py-20 text-gray-600">
        <h2 className="text-2xl font-semibold mb-2">No Cars Available</h2>
        <p>No cars match the current criteria or none are listed yet. Please check back later!</p>
    </div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
        <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Discover Your Next Ride</h1>
            <p className="mt-2 text-lg text-gray-600">Explore our diverse fleet of vehicles ready for your adventure.</p>
        </header>
        {/* TODO: Add Filters and Sort options here - Place a filter bar component */}
        {/* <CarFiltersAndSort /> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {cars.map((car) => (
            <Link key={car.id} href={`/cars/${car.id}`} className="block group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden transform hover:-translate-y-1">
                <div className="relative w-full h-56"> {/* Fixed height container for image */}
                {car.images && car.images.length > 0 ? (
                    <Image
                    src={car.images[0]} // Display the first image
                    alt={car.title || `${car.make} ${car.model}`}
                    fill // Use fill to make image cover the container
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // Responsive sizes
                    style={{ objectFit: 'cover' }} // Ensures image covers, might crop
                    className="transition-transform duration-500 group-hover:scale-110"
                    priority={cars.indexOf(car) < 4} // Prioritize loading images for the first few cards
                    onError={(e) => { e.currentTarget.src = '/placeholder-car.svg'; e.currentTarget.srcset = '' }} // Fallback
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    <FiImage className="w-12 h-12" />
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-md">
                    {formatEnum(car.category)}
                </div>
                </div>
                
                <div className="p-4 space-y-2">
                    <h2 className="text-lg font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                        {car.title || `${car.make} ${car.model}`}
                    </h2>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                        <span className="inline-flex items-center"><FiCalendar className="mr-1 w-3 h-3"/> {car.year}</span>
                        <span className="inline-flex items-center"><FiMapPin className="mr-1 w-3 h-3"/> {car.location.length > 20 ? `${car.location.substring(0,20)}...` : car.location}</span>
                    </div>
                    
                    <RenderStars rating={car.averageRating} totalRatings={car.totalRatings} />
                    
                    <div className="pt-1 flex justify-between items-center">
                        <p className="text-xl font-bold text-blue-700">
                            KES {car.pricePerDay.toLocaleString()}
                            <span className="text-xs font-normal text-gray-500">/day</span>
                        </p>
                        {/* <p className="text-xs text-gray-500">By {car.owner?.name || 'Owner'}</p> */}
                    </div>
                </div>
            </Link>
            ))}
        </div>

        {/* TODO: Add Pagination controls if totalCars > carsPerPage */}
        </div>
    </div>
  );
}