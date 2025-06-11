// src/app/page.tsx

// If Hero uses client hooks (like useRouter, useState, framer-motion),
// HomePage will effectively become a client component if Hero is defined in the same file,
// or Hero should be in its own file with 'use client' and imported here.
// For this example, assuming Hero makes HomePage a client component.
"use client"; 

import React, { useEffect, useState, JSX } from 'react'; // Added useEffect, useState for client-side data fetching
import Link from 'next/link';
import { Car, CarCategory as PrismaCarCategoryEnum } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import NextImage from 'next/image'; // Standard import for Next Image

// Framer Motion & Custom Button for the new Hero
import { motion } from 'framer-motion';
import CustomButton from '@/components/buttons/CustomButton'; // Assuming path from your Hero
import { useRouter } from 'next/navigation'; // Used in your Hero

import {
  Search, MapPin, Users, ShieldCheck, Smile, CarFront,
  CircleDollarSign, ListChecks, TrendingUp, Sparkles, MessageCircle
} from 'lucide-react';

// --- YOUR NEW HERO COMPONENT (Integrated) ---
const MotionImage = motion(NextImage); // Use NextImage with framer-motion

const HeroSectionNew = () => { // Renamed to HeroSectionNew to avoid conflict with your old one
  const router = useRouter();

  const scrollToCatalog = () => {
    const catalogElement = document.getElementById('featured-cars-catalog'); // Ensure this ID exists
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/browse-cars'); 
    }
  };

  // Client-side form handler for hero search

  return (
    <section 
      className='relative flex min-h-[calc(100vh-6rem)] scroll-mt-[6rem] flex-col items-center justify-center gap-8 px-4 py-16 md:flex-row md:gap-0 md:py-0 lg:px-8 xl:px-16 overflow-hidden bg-slate-900' // Added bg color
    >
      {/* Optional subtle background pattern */}
      <div className="absolute inset-0 opacity-5 bg-[url('/patterns/subtle-dots.svg')] bg-repeat"></div>

      {/* HERO TEXT CONTAINER */}
      <div className='flex flex-col gap-6 md:w-1/2 md:gap-8 text-center md:text-left z-10'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className='flex flex-col'
        >
          <h1 className='text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-md'>
            Find, book, rent a car - <span className="block sm:inline text-sky-400">quick and super easy!</span>
          </h1>
          <h2 className='mt-4 text-lg text-slate-300 sm:text-xl md:max-w-md lg:max-w-lg drop-shadow'>
            Streamline your car rental experience with our effortless booking
            process.
          </h2>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
            <CustomButton
              // Ensure these CSS classes are defined and provide desired gradient/text color
              className='btn-medium sm:btn-large btn-gradient mt-4 self-center md:self-start text-light sm:mb-0 px-8 py-3 text-base' 
              handleClick={() => scrollToCatalog()}
            >
              Explore Cars
            </CustomButton>
        </motion.div>

      </div>
      
      {/* HERO BG-IMG CONTAINER for desktop (defined in globals.css or Tailwind config) */}
      <div className='hero-bg hidden md:block'></div> 
      
      {/* HERO IMG CONTAINER */}
      <div className='relative flex w-full flex-1 items-center justify-center md:w-1/2 md:justify-end mt-8 md:mt-0'>
        {/* Mobile background specific to this div if different from desktop hero-bg */}
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-contain bg-center bg-no-repeat md:hidden opacity-30 z-0"></div>
        
        <MotionImage
          initial={{ opacity: 0, scale: 0.5, x: 100 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.85, type: "spring", stiffness: 80, delay: 0.2 }}
          src='/images/hero.png' 
          width={600} 
          height={600}
          className='z-10 h-auto w-full max-w-xs object-contain sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl drop-shadow-2xl'
          alt='SafariRide Hero Car'
          priority 
        />
      </div>
    </section>
  )
}
// --- END NEW HERO COMPONENT ---


// Define expected types for fetched data
interface FeaturedCar extends Pick<Car, 'id' | 'make' | 'model' | 'year' | 'pricePerDay' | 'location' | 'category' | 'description' | 'title'> {
  images: string[]; 
}

interface CategoryData {
  name: PrismaCarCategoryEnum;
  count: number;
  imageUrl?: string; // Optional for category images
}

// Helper data fetching functions (keep these outside component if HomePage is client)
async function getFeaturedCars(): Promise<FeaturedCar[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/homepage/featured-cars`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.error("Failed to fetch featured cars:", response.status, await response.text().catch(()=>""));
      return [];
    }
    return response.json();
  } catch (error) {
    console.error("Error in getFeaturedCars:", error);
    return [];
  }
}

async function getCarCategories(): Promise<CategoryData[]> {
   try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/homepage/categories`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.error("Failed to fetch categories:", response.status, await response.text().catch(()=>""));
      return [];
    }
    return response.json();
  } catch (error) {
    console.error("Error in getCarCategories:", error);
    return [];
  }
}


function FeaturedCarsSection({ cars }: { cars: FeaturedCar[] }) {
  if (!cars || cars.length === 0) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        <p className="text-center text-gray-600">No featured cars available at the moment. Check back soon!</p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Featured Rides</h2>
      <p className="text-lg text-gray-600 mb-10 text-center max-w-xl mx-auto">Handpicked vehicles perfect for your next adventure, ready to hit the road.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cars.map((car) => (
          <Card key={car.id} className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <Link href={`/cars/${car.id}`} className="block group">
              <CardHeader className="p-0">
                {car.images && car.images.length > 0 ? (
                  <NextImage
                    src={car.images[0]}
                    alt={`${car.make} ${car.model}`}
                    width={400}
                    height={224}
                    className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ width: '100%', height: '224px', objectFit: 'cover' }}
                    priority={false}
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
                    <CarFront className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-xl truncate group-hover:text-sky-600">{car.make} {car.model}</CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-1">
                  {car.year} • {car.category.replace(/_/g, ' ')}
                </CardDescription>
                <p className="text-gray-700 mt-2 text-sm truncate flex items-center">
                  <MapPin className="mr-1 h-4 w-4 text-gray-500" /> {car.location}
                </p>
                <div className="mt-3">
                  <p className="text-xl font-bold text-sky-700">
                    KES {car.pricePerDay.toLocaleString()}
                    <span className="text-xs text-gray-500 font-normal">/day</span>
                  </p>
                </div>
              </CardContent>
            </Link>
            <CardFooter className="p-4 pt-0">
                <Button asChild variant="outline" className="w-full group-hover:bg-sky-500 group-hover:text-white">
                    <Link href={`/cars/${car.id}`}>View Details</Link>
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="text-center mt-12">
        <Button asChild size="lg" variant="outline">
          <Link href="/browse-cars">
            Explore All Cars <TrendingUp className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function CarCategoriesSection({ categories }: { categories: CategoryData[] }) {
  if (!categories || categories.length === 0) return null;

  const categoryIcons: Record<string, JSX.Element> = {
    SUV: <CarFront className="mr-2 h-5 w-5"/>,
    SEDAN: <CarFront className="mr-2 h-5 w-5"/>, // Replace with more specific icons if available
    VAN: <CarFront className="mr-2 h-5 w-5"/>,
    FOUR_BY_FOUR: <CarFront className="mr-2 h-5 w-5"/>,
    LUXURY: <Sparkles className="mr-2 h-5 w-5"/>,
    TRUCK: <CarFront className="mr-2 h-5 w-5"/>,
    HATCHBACK: <CarFront className="mr-2 h-5 w-5"/>,
    DEFAULT: <CarFront className="mr-2 h-5 w-5"/>
  };

  return (
    <section className="bg-slate-50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Explore by Category</h2>
        <p className="text-lg text-gray-600 mb-10 text-center max-w-xl mx-auto">Find the right type of vehicle for any terrain or occasion.</p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {categories.map((category) => (
            <Button asChild key={category.name} variant="outline" size="lg" className="shadow-sm hover:shadow-md hover:border-sky-500 hover:text-sky-600">
              <Link href={`/browse-cars?category=${category.name}`}>
                {categoryIcons[category.name] || categoryIcons.DEFAULT}
                {category.name.replace(/_/g, ' ')}
                <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{category.count}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: <Search className="h-10 w-10 text-sky-500" />, title: "Search & Discover", description: "Easily find cars by location, type, and dates. Filter by features to match your exact needs." },
    { icon: <ListChecks className="h-10 w-10 text-sky-500" />, title: "Select & Customize", description: "Choose your vehicle, select rental period, and add any extras. Transparent pricing always." },
    { icon: <CircleDollarSign className="h-10 w-10 text-sky-500" />, title: "Book Securely", description: "Confirm your booking with confidence through our secure payment system or choose to pay on delivery." },
    { icon: <CarFront className="h-10 w-10 text-sky-500" />, title: "Ride & Adventure", description: "Pick up your car and enjoy your journey! We're here if you need support along the way." },
  ];

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">How SafariRide Works</h2>
      <p className="text-lg text-gray-600 mb-10 text-center max-w-xl mx-auto">Renting a car for your adventure is simple and straightforward.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => (
          <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-sky-100 rounded-full p-4 w-fit mb-4">
                {step.icon}
              </div>
              <CardTitle className="text-xl">{index + 1}. {step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
function WhyChooseUsSection() {
  const reasons = [
    { icon: <ShieldCheck className="h-8 w-8 text-green-500" />, title: "Verified & Safe", description: "All vehicles are verified for safety and quality. Rent with peace of mind." },
    { icon: <Smile className="h-8 w-8 text-yellow-500" />, title: "Transparent Pricing", description: "No hidden fees. What you see is what you pay. Fair and competitive rates." },
    { icon: <Users className="h-8 w-8 text-blue-500" />, title: "Trusted Community", description: "Join a growing community of happy renters and reliable car owners." },
    { icon: <MessageCircle className="h-8 w-8 text-purple-500" />, title: "24/7 Support", description: "Our dedicated support team is always here to help you, any time of day." },
  ];
  return (
    <section className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-2 text-center">Why Choose SafariRide?</h2>
            <p className="text-lg text-slate-300 mb-10 text-center max-w-xl mx-auto">We&#39;re committed to providing you the best car rental experience for your adventures.</p>
            <div className="grid md:grid-cols-2 gap-8">
                {reasons.map((reason, index) => (
                    <div key={index} className="flex items-start space-x-4 p-6 bg-white/5 rounded-lg">
                        <div className="flex-shrink-0 bg-white/10 p-3 rounded-full">
                            {reason.icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-sky-400">{reason.title}</h3>
                            <p className="text-slate-300 mt-1 text-sm">{reason.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}

// --- Main Homepage Component ---
export default function HomePage() {
  const [featuredCars, setFeaturedCars] = useState<FeaturedCar[]>([]);
  const [carCategories, setCarCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.allSettled([getFeaturedCars(), getCarCategories()])
      .then(results => {
        const carsResult = results[0];
        const categoriesResult = results[1];

        if (carsResult.status === 'fulfilled') {
          setFeaturedCars(carsResult.value);
        } else {
          console.error("Failed to fetch featured cars:", carsResult.reason);
          setError(prev => prev ? `${prev}\nFeatured Cars: ${String(carsResult.reason)}` : `Featured Cars: ${String(carsResult.reason)}`);
        }
        if (categoriesResult.status === 'fulfilled') {
          setCarCategories(categoriesResult.value);
        } else {
          console.error("Failed to fetch car categories:", categoriesResult.reason);
           setError(prev => prev ? `${prev}\nCar Categories: ${String(categoriesResult.reason)}` : `Car Categories: ${String(categoriesResult.reason)}`);
        }
      })
      .catch(overallError => {
        console.error("Error fetching homepage data:", overallError);
        setError(String(overallError.message || "Failed to load homepage data."));
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="bg-slate-100">
      <HeroSectionNew /> {/* Using your new Hero component */}
      
      {error && (
        <div className="container mx-auto px-4 py-8">
            <div className="p-4 bg-red-100 text-red-700 rounded-md text-sm">
                <strong>Error loading page content:</strong> {error}
            </div>
        </div>
      )}

      {isLoading ? (
        <div className="container mx-auto px-4 py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading amazing adventures...</p>
        </div>
      ) : (
        <>
          <FeaturedCarsSection cars={featuredCars} />
          <Separator className="my-8 md:my-12 bg-slate-200" />
          <CarCategoriesSection categories={carCategories} />
          <Separator className="my-8 md:my-12 bg-slate-200" />
          <HowItWorksSection />
          <WhyChooseUsSection />

          <section className="container mx-auto px-4 py-12 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">Ready for Your Next Great Adventure?</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto text-lg">
              Don&#39;t just dream about it. SafariRide makes it easy to find and rent the perfect vehicle.
              Start planning today!
            </p>
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg py-4 px-8 h-auto">
                <Link href="/browse-cars">
                    Find Your Perfect Car Now <Sparkles className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </section>
        </>
      )}
    </div>
  );
}

// Make sure these section components are defined as in your previous code
// function CarCategoriesSection({ categories }: { categories: CategoryData[] }) { /* ... */ }
// function HowItWorksSection() { /* ... */ }
// function WhyChooseUsSection() { /* ... */ }