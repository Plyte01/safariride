import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, verificationCode } = await req.json();

    if (!phoneNumber || !verificationCode) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    // TODO: Implement actual SMS verification logic here
    // For now, we'll just mark the phone as verified
    // In production, you should:
    // 1. Verify the code against what was sent via SMS
    // 2. Check if the code is expired
    // 3. Use a service like Twilio for SMS verification

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phoneNumber,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      message: 'Phone number verified successfully',
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify phone number' },
      { status: 500 }
    );
  }
} 