import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import {
  UserRole,
  CarCategory,
  TransmissionType,
  FuelType,
  Prisma,
  BookingStatus,
} from '@prisma/client'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function assertAdmin () {
  const session = await getServerSession(authOptions)
  const isAdmin =
    session && session.user && (session.user as { role?: UserRole }).role === UserRole.ADMIN

  if (!isAdmin) {
    throw new NextResponse(
      JSON.stringify({ message: 'Forbidden: Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

type ParamsPromise = Promise<{ carId: string }>

/* -------------------------------------------------------------------------- */
/* GET /api/admin/cars/[carId]                                                */
/* -------------------------------------------------------------------------- */

export async function GET (
  _req: NextRequest,
  context: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { carId } = await context.params

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    if (!car) {
      return NextResponse.json({ message: 'Car not found' }, { status: 404 })
    }
    return NextResponse.json(car)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('GET admin car failed:', err)
    return NextResponse.json(
      { message: 'Error fetching car details', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PUT /api/admin/cars/[carId]                                                */
/* -------------------------------------------------------------------------- */

export async function PUT (
  req: NextRequest,
  context: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { carId } = await context.params

    const carToUpdate = await prisma.car.findUnique({ where: { id: carId } })
    if (!carToUpdate) {
      return NextResponse.json({ message: 'Car not found' }, { status: 404 })
    }

    const body = await req.json()

    /* --------- Validation (trimmed for brevity – keep yours here) --------- */
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
      images,
      availableFrom,
      availableTo,
      isListed,
      isVerified,
      isActive,
      ownerId,
    } = body

    const parsedYear = year ? parseInt(year, 10) : undefined
    const dataToUpdate: Prisma.CarUpdateInput = {}

    /* ---------------- Conditionally build update payload ----------------- */
    if (title !== undefined) dataToUpdate.title = title
    if (make !== undefined) dataToUpdate.make = make
    if (model !== undefined) dataToUpdate.model = model
    if (parsedYear !== undefined) dataToUpdate.year = parsedYear
    if (color !== undefined) dataToUpdate.color = color || null
    if (licensePlate !== undefined) dataToUpdate.licensePlate = licensePlate || null
    if (transmission !== undefined)
      dataToUpdate.transmission = transmission as TransmissionType
    if (fuelType !== undefined) dataToUpdate.fuelType = fuelType as FuelType
    if (seats !== undefined) dataToUpdate.seats = parseInt(seats, 10)
    if (category !== undefined) dataToUpdate.category = category as CarCategory
    if (features !== undefined)
      dataToUpdate.features = Array.isArray(features) ? features : []
    if (typeof pricePerHour === 'number')
      dataToUpdate.pricePerHour = pricePerHour
    else if (typeof pricePerHour === 'string' && pricePerHour.trim() !== '')
      dataToUpdate.pricePerHour = parseFloat(pricePerHour)
    if (pricePerDay !== undefined)
      dataToUpdate.pricePerDay = parseFloat(pricePerDay)
    if (location !== undefined) dataToUpdate.location = location
    if (latitude !== undefined)
      dataToUpdate.latitude =
        latitude === null ? null : parseFloat(latitude)
    if (longitude !== undefined)
      dataToUpdate.longitude =
        longitude === null ? null : parseFloat(longitude)
    if (description !== undefined) dataToUpdate.description = description
    if (images !== undefined && Array.isArray(images))
      dataToUpdate.images = images.filter(
        (img) => typeof img === 'string' && img.trim() !== '',
      )
    if (availableFrom !== undefined)
      dataToUpdate.availableFrom = availableFrom ? new Date(availableFrom) : null
    if (availableTo !== undefined)
      dataToUpdate.availableTo = availableTo ? new Date(availableTo) : null
    if (isListed !== undefined) dataToUpdate.isListed = Boolean(isListed)
    if (isVerified !== undefined) dataToUpdate.isVerified = Boolean(isVerified)
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive)
    if (ownerId !== undefined) {
      const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } })
      if (!ownerExists) {
        return NextResponse.json(
          { message: 'New owner ID not found.' },
          { status: 400 },
        )
      }
      dataToUpdate.owner = { connect: { id: ownerId } }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields provided for update.' },
        { status: 400 },
      )
    }

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: dataToUpdate,
    })

    return NextResponse.json(updatedCar)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('PUT admin car failed:', err)
    return NextResponse.json(
      { message: 'Failed to update car', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE /api/admin/cars/[carId]                                             */
/* -------------------------------------------------------------------------- */

export async function DELETE (
  _req: NextRequest,
  context: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { carId } = await context.params

    const carExists = await prisma.car.findUnique({ where: { id: carId } })
    if (!carExists) {
      return NextResponse.json({ message: 'Car not found' }, { status: 404 })
    }

    const activeBookings = await prisma.booking.count({
      where: {
        carId,
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.AWAITING_PAYMENT,
            BookingStatus.ON_DELIVERY_PENDING,
            BookingStatus.PENDING,
          ],
        },
      },
    })
    if (activeBookings > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete car: It has ${activeBookings} active or pending bookings. Please resolve them first.`,
        },
        { status: 409 },
      )
    }

    await prisma.car.delete({ where: { id: carId } })

    return NextResponse.json({
      message: 'Car deleted successfully by admin',
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('DELETE admin car failed:', err)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { message: `Car with ID ${await (await context.params).carId} not found.` },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { message: 'Failed to delete car', details: String(err) },
      { status: 500 },
    )
  }
}
