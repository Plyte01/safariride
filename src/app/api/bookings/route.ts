import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path if needed
import {
  BookingStatus,
  PaymentMethod,
  PaymentType,
  PaymentStatus as PrismaPaymentStatus // Renamed to avoid conflict with local var
} from '@prisma/client';

// Helper function to check car availability (remains similar)
async function isCarAvailable(carId: string, startDate: Date, endDate: Date): Promise<boolean> {
  const overlappingBookings = await prisma.booking.count({
    where: {
      carId: carId,
      status: { // Only consider bookings that are not definitively cancelled
        notIn: [BookingStatus.CANCELLED /* , BookingStatus.PAYMENT_FAILED - decide if this makes car available */ ],
      },
      AND: [
        { startDate: { lt: endDate } },
        { endDate: { gt: startDate } },
      ],
    },
  });
  return overlappingBookings === 0;
}

// Helper function to calculate price (remains similar)
function calculateTotalPrice(carPricePerDay: number, startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  // Ensure at least 1 day is charged if times are within the same 24-hour period for daily rates
  let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0 && diffTime > 0) { // Less than 24 hours but some duration
      diffDays = 1; // Charge for at least one day
  } else if (diffDays === 0 && diffTime === 0) { // Start and end are identical, not allowed by validation
      return 0; // Or throw error, handled by validation
  }
  return diffDays * carPricePerDay;
}

// POST /api/bookings - Create a new booking
export async function POST(req: NextRequest, ) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }
  // Any authenticated user can attempt to book (role check might be elsewhere or not needed for creation)

  try {
    const body = await req.json();
    const {
      carId,
      startDate: startDateString,
      endDate: endDateString,
      pickupLocation, // From your schema
      returnLocation, // From your schema
      paymentMethod,  // From your schema's PaymentMethod enum
      notes,          // Optional notes
    } = body;

    // 1. Validate input
    if (!carId || !startDateString || !endDateString || !pickupLocation || !returnLocation || !paymentMethod) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        return NextResponse.json({ message: 'Invalid payment method.'}, { status: 400 });
    }

    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
    }
    if (startDate >= endDate) {
      return NextResponse.json({ message: 'End date must be after start date.' }, { status: 400 });
    }
    const now = new Date();
    now.setHours(0,0,0,0); // Compare dates only for past check
    if (startDate < now) {
        return NextResponse.json({ message: 'Start date cannot be in the past.' }, { status: 400 });
    }


    // 2. Fetch Car details
    const car = await prisma.car.findUnique({
      where: { id: carId },
    });

    if (!car) {
      return NextResponse.json({ message: 'Car not found.' }, { status: 404 });
    }
    if (!car.isActive || !car.isVerified) { // Using isActive from your schema
      return NextResponse.json({ message: 'This car is not currently available for booking.' }, { status: 400 });
    }
    // Check against car.availableFrom and car.availableTo if they are set
    if (car.availableFrom && startDate < car.availableFrom) {
        return NextResponse.json({ message: `This car is only available from ${car.availableFrom.toLocaleDateString()}.` }, { status: 400 });
    }
    if (car.availableTo && endDate > car.availableTo) {
        return NextResponse.json({ message: `This car is only available until ${car.availableTo.toLocaleDateString()}.` }, { status: 400 });
    }


    // 3. Check Car Availability
    const available = await isCarAvailable(carId, startDate, endDate);
    if (!available) {
      return NextResponse.json({ message: 'Car is not available for the selected dates.' }, { status: 409 });
    }

    // 4. Calculate Total Price
    const totalPrice = calculateTotalPrice(car.pricePerDay, startDate, endDate);
    if (totalPrice <= 0) {
        return NextResponse.json({ message: 'Invalid booking duration or price calculation error.' }, { status: 400 });
    }

    // 5. Determine initial booking and payment statuses
    let initialBookingStatus: BookingStatus;
    let initialPaymentStatus: PrismaPaymentStatus;
    let initialPaymentType: PaymentType;

    const onlinePaymentMethods: PaymentMethod[] = [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.PAYPAL,
      PaymentMethod.MPESA
    ];

    if (onlinePaymentMethods.includes(paymentMethod as PaymentMethod)) {
      initialBookingStatus = BookingStatus.AWAITING_PAYMENT; // Awaiting online payment
      initialPaymentStatus = PrismaPaymentStatus.PENDING;
      initialPaymentType = PaymentType.ONLINE;
    } else if (paymentMethod === PaymentMethod.CASH) { // Assuming CASH is Pay on Delivery
      initialBookingStatus = BookingStatus.ON_DELIVERY_PENDING; // Awaiting owner confirmation for cash payment
      initialPaymentStatus = PrismaPaymentStatus.PENDING; // Or a specific status like 'ON_DELIVERY_EXPECTED' if you add it
      initialPaymentType = PaymentType.ON_DELIVERY;
    } else {
      // Should be caught by enum validation, but as a fallback
      return NextResponse.json({ message: 'Unsupported payment method for this flow.'}, { status: 400 });
    }

    // 6. Create Booking and Payment records in a transaction
    let newBookingWithPayment;
    try {
      newBookingWithPayment = await prisma.$transaction(async (tx) => {
        const createdBooking = await tx.booking.create({
          data: {
            carId,
            userId: session.user.id,
            startDate,
            endDate,
            pickupLocation,
            returnLocation,
            totalPrice,
            status: initialBookingStatus,
            notes: notes || null,
          },
        });

        await tx.payment.create({
          data: {
            amount: totalPrice,
            currency: (await tx.platformSetting.findUnique({where: {key: 'DEFAULT_CURRENCY'}}))?.value || 'KES', // Get currency from settings
            paymentMethod: paymentMethod as PaymentMethod,
            paymentType: initialPaymentType,
            status: initialPaymentStatus,
            bookingId: createdBooking.id,
            userId: session.user.id,
            // transactionId, receiptUrl, invoiceUrl will be updated later post-payment processing
          },
        });

        // Return booking with its payment (or just booking if preferred)
        return tx.booking.findUnique({
            where: { id: createdBooking.id },
            include: {
                payment: true,
                car: { select: { make: true, model: true, images: true, owner: { select: { name: true, email: true }} } },
                user: { select: { name: true, email: true } }
            }
        });
      });
    } catch (e) {
        console.error("Transaction failed: ", e);
        return NextResponse.json({ message: 'Booking transaction failed. Please try again.' }, { status: 500 });
    }


    // 7. TODO: If ONLINE paymentMethod, initiate payment flow (Stripe/Mpesa)
    //    - Create Payment Intent with Stripe, get client_secret.
    //    - Send STK Push for Mpesa.
    //    - Update `Payment` record with `transactionId` (e.g., Stripe Payment Intent ID).
    //    - The response to the client might include info needed for client-side payment steps.
    //    For now, we return the booking and payment objects.

    // 8. TODO: Send notifications (using your Notification model)

    return NextResponse.json(newBookingWithPayment, { status: 201 });

  } catch (error) {
    console.error('Booking creation error:', error);
    let errorMessage = 'An unexpected error occurred during booking creation.';
    if (error instanceof Error) { errorMessage = error.message; }
    return NextResponse.json(
      { message: 'Internal Server Error', error: errorMessage },
      { status: 500 }
    );
  }
}