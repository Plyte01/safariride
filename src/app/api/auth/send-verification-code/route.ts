import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { sendVerificationCode, generateVerificationCode, isValidPhoneNumber } from '@/lib/twilio';
import { RateLimiter } from '@/lib/rate-limiter';

// Create a rate limiter for phone verification (3 attempts per hour)
const rateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimitResult = await rateLimiter.check(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many verification attempts',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Store the verification code in the database
    await prisma.verificationToken.create({
      data: {
        identifier: phoneNumber,
        token: verificationCode,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      },
    });

    // Send verification code via Twilio
    await sendVerificationCode(phoneNumber, verificationCode);

    return NextResponse.json({
      message: 'Verification code sent successfully',
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
} 