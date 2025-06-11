// src/app/api/cars/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path as necessary
import { UserRole, CarCategory, TransmissionType, FuelType, Prisma } from '@prisma/client'; // Added Prisma for error type

// GET /api/cars - Fetch all listed cars
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Allow admin to see unverified/unlisted cars via query param for testing/management
    const showAllAdmin = searchParams.get('showAllAdmin') === 'true'; 
    const session = await getServerSession(authOptions);
    type SessionUser = {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
    };
    const isAdmin = session?.user && (session.user as SessionUser).role === UserRole.ADMIN;

    const whereClause: Prisma.CarWhereInput = {}; // Use Prisma type for whereClause

    if (isAdmin && showAllAdmin) {
        // Admin with showAllAdmin flag sees everything, no status filters
    } else {
        // Default public view: must be listed, verified, and active
        whereClause.isListed = true;
        whereClause.isVerified = true;
        whereClause.isActive = true; // Using isActive from your schema
    }

    // TODO: Add pagination, filtering (by make, model, category, location, price range etc.), sorting
    const cars = await prisma.car.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc', // Default sort by newest
      },
      include: {
        owner: { 
          select: {
            id: true,
            name: true,
            image: true, // Include owner's image if available
          },
        },
      },
    });
    return NextResponse.json(cars, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch cars:', error);
    return NextResponse.json({ message: 'Failed to fetch cars', details: String(error) }, { status: 500 });
  }
}

// POST /api/cars - Create a new car
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  type SessionUser = {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
  };
  const userRole = (session.user as SessionUser).role;
  if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: User must be an Owner or Admin to list a car.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      make,
      model,
      year,
      color,
      licensePlate,
      transmission,
      fuelType,
      seats,
      category,
      features,
      pricePerHour,
      pricePerDay,
      location,
      latitude,
      longitude,
      description,
      images, // Expecting 'images' array of strings
      availableFrom,
      availableTo,
      isListed, // Owner's intention to list immediately
      // isActive and isVerified will be handled by logic/admin
    } = body;

    // --- Robust Validation ---
    const requiredFields = { title, make, model, year, pricePerDay, location, description, category, transmission, fuelType, seats };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return NextResponse.json({ message: `Missing required field: ${key}` }, { status: 400 });
        }
    }

    if (!images || !Array.isArray(images) || images.length === 0 || images.some(img => typeof img !== 'string' || img.trim() === '')) {
        return NextResponse.json({ message: 'At least one valid image URL in the "images" array is required.' }, { status: 400 });
    }
    const validImages = images.filter(img => typeof img === 'string' && img.trim() !== '');
    if (validImages.length === 0) {
        return NextResponse.json({ message: 'No valid image URLs provided.' }, { status: 400 });
    }
    
    // Enum Validations
    if (!Object.values(CarCategory).includes(category as CarCategory)) {
        return NextResponse.json({ message: `Invalid car category: ${category}` }, { status: 400 });
    }
    if (!Object.values(TransmissionType).includes(transmission as TransmissionType)) {
        return NextResponse.json({ message: `Invalid transmission type: ${transmission}` }, { status: 400 });
    }
    if (!Object.values(FuelType).includes(fuelType as FuelType)) {
        return NextResponse.json({ message: `Invalid fuel type: ${fuelType}` }, { status: 400 });
    }

    const parsedYear = parseInt(year, 10);
    const parsedSeats = parseInt(seats, 10);
    const parsedPricePerDay = parseFloat(pricePerDay);

    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 2) {
        return NextResponse.json({ message: 'Invalid year provided.' }, { status: 400 });
    }
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
        return NextResponse.json({ message: 'Invalid number of seats.' }, { status: 400 });
    }
    if (isNaN(parsedPricePerDay) || parsedPricePerDay <= 0) {
        return NextResponse.json({ message: 'Invalid price per day.' }, { status: 400 });
    }
    //const parsedPricePerHour = pricePerHour ? parseFloat(pricePerHour) : null;
    let parsedPricePerHour: number | null = null; // Default to null
    if (pricePerHour !== undefined && pricePerHour !== null && String(pricePerHour).trim() !== "") {
        const tempParsed = parseFloat(String(pricePerHour));
        if (!isNaN(tempParsed) && tempParsed >= 0) {
            parsedPricePerHour = tempParsed;
        } else {
            // Invalid non-empty value for pricePerHour
            return NextResponse.json({ message: 'Invalid value provided for Price per Hour. Must be a non-negative number or empty.' }, { status: 400 });
        }
    } // If pricePerHour is empty, undefined, or null, finalPricePerHour remains null.
    const parsedLatitude = latitude ? parseFloat(latitude) : null;
    if (parsedLatitude !== null && (isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)) {
        return NextResponse.json({ message: 'Invalid latitude.' }, { status: 400 });
    }
    const parsedLongitude = longitude ? parseFloat(longitude) : null;
    if (parsedLongitude !== null && (isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180)) {
        return NextResponse.json({ message: 'Invalid longitude.' }, { status: 400 });
    }
    const parsedAvailableFrom = availableFrom ? new Date(availableFrom) : null;
    if (parsedAvailableFrom && isNaN(parsedAvailableFrom.getTime())) {
        return NextResponse.json({ message: 'Invalid "Available From" date.' }, { status: 400 });
    }
    const parsedAvailableTo = availableTo ? new Date(availableTo) : null;
    if (parsedAvailableTo && isNaN(parsedAvailableTo.getTime())) {
        return NextResponse.json({ message: 'Invalid "Available To" date.' }, { status: 400 });
    }
    if (parsedAvailableFrom && parsedAvailableTo && parsedAvailableFrom >= parsedAvailableTo) {
        return NextResponse.json({ message: '"Available To" date must be after "Available From" date.' }, { status: 400 });
    }


    // Fetch owner's trust status for hybrid verification
    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isTrustedOwner: true }
    });

    if (!owner) { // Should ideally not happen if session is valid
      return NextResponse.json({ message: 'Owner data not found.' }, { status: 404 });
    }

    const carIsVerifiedByDefault = owner.isTrustedOwner; // True if owner is trusted

    const carDataToCreate: Prisma.CarCreateInput = {
      title,
      make,
      model,
      year: parsedYear,
      color: color || null,
      licensePlate: licensePlate || null,
      transmission: transmission as TransmissionType,
      fuelType: fuelType as FuelType,
      seats: parsedSeats,
      category: category as CarCategory,
      features: Array.isArray(features) ? features.filter(f => typeof f === 'string' && f.trim() !== '') : [],
      pricePerHour: parsedPricePerHour,
      pricePerDay: parsedPricePerDay,
      location,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      description,
      images: validImages,
      availableFrom: parsedAvailableFrom,
      availableTo: parsedAvailableTo,
      isListed: typeof isListed === 'boolean' ? isListed : true, // Default to listed
      isVerified: carIsVerifiedByDefault, // Based on owner trust
      isActive: true, // New cars are active by default, admin can deactivate
      owner: { connect: { id: session.user.id } }, // Connect to the owner
    };

    const newCar = await prisma.car.create({
      data: carDataToCreate,
    });

    return NextResponse.json(newCar, { status: 201 });
  } catch (error) {
    console.error('Failed to create car:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (e.g., licensePlate)
        if (error.code === 'P2002') {
            const target = (error.meta?.target as string[])?.join(', ');
            return NextResponse.json({ message: `A car with this ${target || 'detail'} already exists.` }, { status: 409 });
        }
    }
    let errorMessage = 'An unexpected error occurred while creating the car.';
    if (error instanceof Error && error.message) errorMessage = error.message;
    return NextResponse.json({ message: errorMessage, details: String(error) }, { status: 500 });
  }
}