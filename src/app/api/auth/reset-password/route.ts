// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, email, password, confirmPassword } = await req.json();

    if (!token || !email || !password || !confirmPassword) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match.' }, { status: 400 });
    }
    if (password.length < 8) { // Add your password strength rules
        return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const resetTokenRecord = await prisma.verificationToken.findFirst({
      where: { identifier: email, token: token }, // If hashing tokens, compare hashed token
    });

    if (!resetTokenRecord) {
      return NextResponse.json({ message: 'Invalid or expired password reset token.' }, { status: 400 });
    }
    if (new Date(resetTokenRecord.expires) < new Date()) {
      await prisma.verificationToken.delete({ where: { token: resetTokenRecord.token }});
      return NextResponse.json({ message: 'Password reset token has expired.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Should not happen if token was valid for an email, but good check
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    if (!user.password) {
        // This user signed up with OAuth, they can't reset password this way.
         await prisma.verificationToken.delete({ where: { token: resetTokenRecord.token }}); // Clean up token
        return NextResponse.json({ message: 'This account uses social login and does not have a password to reset.' }, { status: 400 });
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: email },
      data: { password: hashedPassword, emailVerified: user.emailVerified || new Date() }, // Optionally re-verify email
    });

    // Delete the token after successful password reset
    await prisma.verificationToken.delete({ where: { token: resetTokenRecord.token }});

    return NextResponse.json({ message: 'Password has been reset successfully.' }, { status: 200 });

  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ message: 'An error occurred while resetting your password.' }, { status: 500 });
  }
}
