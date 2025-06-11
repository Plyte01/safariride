// src/app/api/auth/request-password-reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) { // User found, even if password is null (OAuth user), send email but they can't reset password via this
      if (!user.password) {
        // User likely signed up with OAuth, guide them
         await sendEmail({
            to: email,
            subject: 'Password Reset Attempt for SafariRide',
            html: `<p>Hello ${user.name || 'User'},</p>
                   <p>We received a request to reset the password for your SafariRide account associated with this email.</p>
                   <p>However, this account was registered using a social login (e.g., Google) and does not have a separate password with SafariRide.</p>
                   <p>If you are having trouble accessing your account, please try logging in with your social provider again.</p>
                   <p>If you did not request this, please ignore this email.</p>`,
        });
        // Return a generic success message to avoid revealing if an email is registered or not for OAuth only users
        return NextResponse.json({ message: 'If an account with this email exists and uses a password, a reset link has been sent.' }, { status: 200 });
      }
      
      // User has a password, proceed with reset token
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // Token expires in 1 hour

      // Use a new purpose or differentiate if using same VerificationToken model,
      // or create a new PasswordResetToken model. For simplicity, reusing with identifier.
      // Ensure old tokens for this email are removed or invalidated.
      await prisma.verificationToken.deleteMany({ where: { identifier: email }}); // Delete old tokens
      await prisma.verificationToken.create({
        data: {
          identifier: email, // Store against email
          token: token,      // HASH THIS TOKEN IN PRODUCTION
          expires,
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: 'Reset Your SafariRide Password',
        html: `
          <h1>Reset Your Password</h1>
          <p>Hello ${user.name || 'User'},</p>
          <p>Please click the link below to reset your password for your SafariRide account:</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Link: <a href="${resetUrl}">${resetUrl}</a></p>
        `,
      });
    }
    // Always return a generic success message to prevent email enumeration attacks
    return NextResponse.json({ message: 'If an account with this email exists and uses a password, a password reset link has been sent.' }, { status: 200 });
  } catch (error) {
    console.error("Request password reset error:", error);
    // Still return generic message for security, but log error
    return NextResponse.json({ message: 'An error occurred. If the issue persists, please contact support.' }, { status: 200 }); // Or 500 for actual error
  }
}