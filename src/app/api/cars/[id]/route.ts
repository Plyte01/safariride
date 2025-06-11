// src/app/api/cars/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path if needed
import { UserRole, CarCategory, TransmissionType, FuelType, Prisma } from '@prisma/client'; // Added Prisma for error type

// --- GET Handler (to fetch car details for the edit page or public view) ---
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: carId } = await params;
  console.log(`GET /api/cars/${carId} - Request received`);

  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!car) {
      console.log(`GET /api/cars/${carId} - Car not found`);
      return NextResponse.json({ message: 'Car not found' }, { status: 404 });
    }

    // Optional: If this GET is also used by the edit page, you might add an ownership check here
    // if only owners/admins should be able to fetch full details for editing.
    // For public view, you'd check isListed, isVerified, isActive.
    // For now, assuming this GET is general purpose or edit page handles its own initial auth.

    console.log(`GET /api/cars/${carId} - Car found and returned`);
    return NextResponse.json(car, { status: 200 });
  } catch (error) {
    console.error(`GET /api/cars/${carId} - Failed to fetch car:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: `Failed to fetch car ${carId}`, details: errorMessage }, { status: 500 });
  }
}


// --- PUT Handler (to update a car) ---
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id: carId } = await params;

  console.log(`PUT /api/cars/${carId} - Update request received.`);
  console.log(`PUT /api/cars/${carId} - Session:`, JSON.stringify(session, null, 2));

  if (!session || !session.user || !session.user.id) {
    console.error(`PUT /api/cars/${carId} - Unauthorized: No session or user ID.`);
    return NextResponse.json({ message: 'Unauthorized: You must be logged in to perform this action.' }, { status: 401 });
  }

  const loggedInUserId = session.user.id;
  type SessionUser = {
    id: string;
    role: UserRole;
    [key: string]: unknown; // allow extra properties if needed
  };
  const userRole = (session.user as SessionUser).role;

  console.log(`PUT /api/cars/${carId} - Logged in User ID: ${loggedInUserId}, Role: ${userRole}`);

  try {
    const carToUpdate = await prisma.car.findUnique({ 
      where: { id: carId },
      select: { ownerId: true } // Select only ownerId for the authorization check first
    });

    if (!carToUpdate) {
      console.warn(`PUT /api/cars/${carId} - Car not found for ID: ${carId}`);
      return NextResponse.json({ message: 'Car not found.' }, { status: 404 });
    }
    console.log(`PUT /api/cars/${carId} - Found car's ownerId: ${carToUpdate.ownerId}`);

    // --- THE CRITICAL AUTHORIZATION CHECK ---
    if (userRole !== UserRole.ADMIN && carToUpdate.ownerId !== loggedInUserId) {
      console.error(`PUT /api/cars/${carId} - Authorization Failed: User ${loggedInUserId} (Role: ${userRole}) is not ADMIN and does not own car (Owner: ${carToUpdate.ownerId}).`);
      return NextResponse.json({ message: 'Forbidden: You do not own this car or lack administrator privileges.' }, { status: 403 });
    }
    console.log(`PUT /api/cars/${carId} - Authorization Passed for user ${loggedInUserId}.`);

    // Proceed with parsing the body and updating
    const body = await req.json();
    const {
        title, make, model, year, color, licensePlate, transmission,
        fuelType, seats, category, features, pricePerHour, pricePerDay,
        location, latitude, longitude, description, images,
        availableFrom, availableTo, isListed, isActive
      } = body;

    // --- Robust Validation for update data (similar to POST) ---
    // (For brevity, this part is summarized - ensure you validate inputs properly)
    // Example:
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
        return NextResponse.json({ message: 'Title cannot be empty if provided for update.' }, { status: 400 });
    }
    // ... add more validations for other fields being updated ...

    const parsedYear = year !== undefined ? parseInt(year, 10) : undefined;
    const parsedSeats = seats !== undefined ? parseInt(seats, 10) : undefined;
    const parsedPricePerDay = pricePerDay !== undefined ? parseFloat(pricePerDay) : undefined;
    
    let parsedPricePerHour: number | null | undefined = undefined; // Start as undefined
    if (pricePerHour === null) { // Explicitly setting to null
        parsedPricePerHour = null;
    } else if (pricePerHour !== undefined && String(pricePerHour).trim() !== "") {
        const tempParsed = parseFloat(String(pricePerHour));
        if (!isNaN(tempParsed) && tempParsed >= 0) {
            parsedPricePerHour = tempParsed;
        } else {
            return NextResponse.json({ message: 'Invalid value for Price per Hour.' }, { status: 400 });
        }
    } // If pricePerHour is undefined or empty string, parsedPricePerHour remains undefined (won't update)


    const updateData: Prisma.CarUpdateInput = {};

    // Conditionally add fields to updateData only if they were provided in the request body
    if (title !== undefined) updateData.title = title;
    if (make !== undefined) updateData.make = make;
    if (model !== undefined) updateData.model = model;
    if (parsedYear !== undefined && !isNaN(parsedYear)) updateData.year = parsedYear;
    if (color !== undefined) updateData.color = color || null;
    if (licensePlate !== undefined) updateData.licensePlate = licensePlate || null; // Consider unique constraint implications
    if (transmission !== undefined) updateData.transmission = transmission as TransmissionType;
    if (fuelType !== undefined) updateData.fuelType = fuelType as FuelType;
    if (parsedSeats !== undefined && !isNaN(parsedSeats)) updateData.seats = parsedSeats;
    if (category !== undefined) updateData.category = category as CarCategory;
    if (features !== undefined) updateData.features = Array.isArray(features) ? features.filter(f => typeof f === 'string' && f.trim() !== '') : [];
    if (parsedPricePerHour !== undefined && parsedPricePerHour !== null) {
        updateData.pricePerHour = parsedPricePerHour;
    }
    // If you want to allow clearing the price (setting to null), ensure your Prisma schema allows null for pricePerHour and use: updateData.pricePerHour = null;
    if (parsedPricePerDay !== undefined && !isNaN(parsedPricePerDay)) updateData.pricePerDay = parsedPricePerDay;
    if (location !== undefined) updateData.location = location;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined && Array.isArray(images)) {
        const validImages = images.filter(img => typeof img === 'string' && img.trim() !== '');
        if (validImages.length > 0) updateData.images = validImages;
        else if (images.length > 0 && validImages.length === 0) return NextResponse.json({ message: 'If images array is provided, it must contain at least one valid URL string.' }, { status: 400 });
        // If images array is empty or not provided, it means no change to images unless explicitly set to [] to clear
    }
    if (availableFrom !== undefined) updateData.availableFrom = availableFrom ? new Date(availableFrom) : null;
    if (availableTo !== undefined) updateData.availableTo = availableTo ? new Date(availableTo) : null;
    if (typeof isListed === 'boolean') updateData.isListed = isListed;
    if (typeof isActive === 'boolean' && userRole === UserRole.ADMIN) { // Only Admin can change isActive directly? Or owner too?
        updateData.isActive = isActive;
    }
    // Note: isVerified is typically only changed by an Admin via a separate verification endpoint.

    if (Object.keys(updateData).length === 0) {
        console.log(`PUT /api/cars/${carId} - No valid fields provided for update.`);
        return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    console.log(`PUT /api/cars/${carId} - Update data being sent to Prisma:`, JSON.stringify(updateData, null, 2));

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: updateData,
    });

    console.log(`PUT /api/cars/${carId} - Car updated successfully.`);
    return NextResponse.json(updatedCar, { status: 200 });
  } catch (error) {
    console.error(`PUT /api/cars/${carId} - Failed to update car:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (
            error.code === 'P2002' &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes('licensePlate')
        ) { // Unique constraint on licensePlate
            return NextResponse.json({ message: 'This license plate is already registered to another car.' }, { status: 409 });
        }
         if (error.code === 'P2025') { // Record to update not found (should have been caught earlier)
            return NextResponse.json({ message: 'Car to update not found.' }, { status: 404 });
        }
    }
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: `Failed to update car ${carId}`, details: errorMessage }, { status: 500 });
  }
}


// --- DELETE Handler (for completeness of the file) ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id: carId } = await params;

  console.log(`DELETE /api/cars/${carId} - Delete request received.`);
  console.log(`DELETE /api/cars/${carId} - Session:`, JSON.stringify(session, null, 2));

  if (!session || !session.user || !session.user.id) {
    console.error(`DELETE /api/cars/${carId} - Unauthorized: No session or user ID.`);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const loggedInUserId = session.user.id;
  type SessionUser = {
    id: string;
    role: UserRole;
    [key: string]: unknown;
  };
  const userRole = (session.user as SessionUser).role;
  console.log(`DELETE /api/cars/${carId} - Logged in User ID: ${loggedInUserId}, Role: ${userRole}`);

  try {
    const carToDelete = await prisma.car.findUnique({ 
        where: { id: carId },
        select: { ownerId: true } 
    });

    if (!carToDelete) {
      console.warn(`DELETE /api/cars/${carId} - Car not found for ID: ${carId}`);
      return NextResponse.json({ message: 'Car not found' }, { status: 404 });
    }
    console.log(`DELETE /api/cars/${carId} - Found car's ownerId: ${carToDelete.ownerId}`);

    if (userRole !== UserRole.ADMIN && carToDelete.ownerId !== loggedInUserId) {
      console.error(`DELETE /api/cars/${carId} - Authorization Failed: User ${loggedInUserId} (Role: ${userRole}) is not ADMIN and does not own car (Owner: ${carToDelete.ownerId}).`);
      return NextResponse.json({ message: 'Forbidden: You do not own this car or lack administrator privileges.' }, { status: 403 });
    }
    console.log(`DELETE /api/cars/${carId} - Authorization Passed for user ${loggedInUserId}.`);

    // Consider related data: bookings, reviews. Prisma onDelete: Cascade in schema handles this if set.
    // If not using onDelete: Cascade, you might need to delete related records manually or disallow deletion if relations exist.
    await prisma.car.delete({
      where: { id: carId },
    });

    console.log(`DELETE /api/cars/${carId} - Car deleted successfully.`);
    return NextResponse.json({ message: 'Car deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`DELETE /api/cars/${carId} - Failed to delete car:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { // Prisma error: Record to delete does not exist.
        return NextResponse.json({ message: `Car with ID ${carId} not found.` }, { status: 404 });
    }
    // P2003: Foreign key constraint failed (e.g. if bookings exist and onDelete is not Cascade/SetNull)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { 
        return NextResponse.json({ message: `Cannot delete car: It has existing bookings or reviews. Please resolve these first.` }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: `Failed to delete car ${carId}`, details: errorMessage }, { status: 500 });
  }
}