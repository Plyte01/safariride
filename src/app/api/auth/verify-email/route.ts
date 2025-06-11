// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  console.log("VERIFY EMAIL API ROUTE ACCESSED - Timestamp:", new Date().toISOString());
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    // Redirect to an error page or show an error message
    return NextResponse.redirect(new URL('/auth/verification-status?success=false&error=missing_params', req.url));
  }

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token, // If hashing, compare hashed token here
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/auth/verification-status?success=false&error=invalid_token', req.url));
    }

    if (new Date(verificationToken.expires) < new Date()) {
      // Optionally delete expired token
      await prisma.verificationToken.delete({ where: { token: verificationToken.token }}); // Or identifier_token if @@unique is on both
      return NextResponse.redirect(new URL('/auth/verification-status?success=false&error=expired_token', req.url));
    }

    // Mark user's email as verified
    await prisma.user.update({
      where: { email: email },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token after successful verification
    await prisma.verificationToken.delete({
      where: { token: verificationToken.token }, // Or identifier_token if @@unique is on both
    });
    
    // Redirect to a success page or login page
    return NextResponse.redirect(new URL('/auth/verification-status?success=true', req.url));

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL('/auth/verification-status?success=false&error=server_error', req.url));
  }
}