// src/app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email'; // Your email utility
import { randomBytes } from 'crypto';   // For generating token

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ message: 'Valid email is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // To prevent email enumeration, you might still return a generic success message,
      // but for clearer feedback during development or specific UX, you could indicate user not found.
      // Let's go with a generic message for security.
      return NextResponse.json({ message: 'If your email is registered and unverified, a new verification link has been sent.' }, { status: 200 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'This email address is already verified.' }, { status: 400 });
    }
    
    if (!user.password) {
        // User signed up via OAuth and doesn't have a password.
        // Their email verification status usually comes from the OAuth provider.
        // If it's not verified via OAuth, this flow might not be the right one.
        // However, if your app logic allows OAuth users to verify email independently:
        // You can proceed, or return a specific message. For now, let's allow resend if they are not verified for some reason.
        console.log(`Resending verification for OAuth user: ${email}. Current verification status: ${user.emailVerified}`);
    }


    // --- Generate New Verification Token & Send Email ---
    const tokenString = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

    // IMPORTANT: In production, HASH `tokenString` before saving to DB
    // const hashedToken = await bcrypt.hash(tokenString, 10); // Example if hashing

    // Delete any previous verification tokens for this email to ensure only the new one is active
    await prisma.verificationToken.deleteMany({
        where: { identifier: user.email } // Assuming identifier is email for verification tokens
    });

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: tokenString, // Store the raw token for this example; HASHED token in production
        expires,
      },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${tokenString}&email=${encodeURIComponent(user.email)}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #333;">Verify Your SafariRide Email Address</h1>
        <p>Hello ${user.name || 'User'},</p>
        <p>We received a request to resend the verification email for your SafariRide account.</p>
        <p>Please click the link below to verify your email address and activate your account:</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Verify Your Email</a>
        </p>
        <p>If the button above doesn't work, please copy and paste the following link into your web browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours. If you did not request this, please ignore this email.</p>
        <p>Best regards,<br/>The SafariRide Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Verify Your SafariRide Account Email (Resend)',
      html: emailHtml,
    });
    // --- End Email Verification Logic ---

    return NextResponse.json({ message: 'A new verification email has been sent. Please check your inbox (and spam folder).' }, { status: 200 });

  } catch (error) {
    console.error('Resend verification email error:', error);
    // Even on error, return a somewhat generic message unless it's a clear client fault
    const errorMessage = 'An error occurred while trying to resend the verification email.';
    if (error instanceof Error) {
        // You might not want to expose too much detail from server errors.
        // errorMessage = error.message; 
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}