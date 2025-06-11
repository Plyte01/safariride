// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client'; // Your UserRole enum
import { sendEmail } from '@/lib/email'; // Import your email utility
import { randomBytes } from 'crypto';   // For generating token
import { Prisma } from '@prisma/client'; // Import Prisma for error types

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, role } = await req.json();

    // 1. Validate input
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields: fullName, email, or password.' },
        { status: 400 }
      );
    }
    if (!/\S+@\S+\.\S+/.test(email)) { // Basic email format validation
      return NextResponse.json({ message: 'Invalid email format.' }, { status: 400 });
    }
    if (password.length < 8) { // Basic password strength
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists but email is not verified, you might want to resend verification
      // or tell them to log in. For simplicity, we'll just say user exists.
      return NextResponse.json(
        { message: 'User with this email already exists. Please try logging in or use a different email.' },
        { status: 409 } // 409 Conflict
      );
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Determine user role
    let userRole: UserRole = UserRole.RENTER; // Default role
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      userRole = role as UserRole;
    }

    // 5. Create user in database
    // emailVerified will be null by default as per your schema
    const newUser = await prisma.user.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        role: userRole,
        // emailVerified is initially null
      },
    });

    // --- 6. Generate Verification Token & Send Email ---
    const tokenString = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

    // In a production app, HASH `tokenString` before saving to DB
    // const hashedToken = await bcrypt.hash(tokenString, 10); // Example if hashing

    // Delete any previous verification tokens for this email to ensure only one is active
    await prisma.verificationToken.deleteMany({
        where: { identifier: newUser.email }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: newUser.email,
        token: tokenString, // Store the raw token for this example; HASHED token in production
        expires,
      },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${tokenString}&email=${encodeURIComponent(newUser.email)}`;
    
    // Construct email content
    // TODO: Use a proper HTML email template for better look and feel
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #333;">Welcome to SafariRide, ${newUser.name || 'Valued User'}!</h1>
        <p>Thank you for registering. To complete your registration and activate your account, please verify your email address by clicking the link below:</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Verify Your Email</a>
        </p>
        <p>If the button above doesn't work, please copy and paste the following link into your web browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours. If you did not create an account on SafariRide, please ignore this email.</p>
        <p>Best regards,<br/>The SafariRide Team</p>
      </div>
    `;

    await sendEmail({
      to: newUser.email,
      subject: 'Activate Your SafariRide Account - Email Verification',
      html: emailHtml,
    });
    // --- End Email Verification Logic ---

    // 7. Return success response
    return NextResponse.json(
      {
        message: 'User registered successfully! A verification email has been sent. Please check your inbox (and spam folder) to activate your account.',
        // Do NOT send sensitive data like password back to the client
        user: { 
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          emailVerified: newUser.emailVerified // will be null
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors, e.g., unique constraint on email if somehow missed the check
        if (error.code === 'P2002') {
            errorMessage = 'This email address is already registered.';
            statusCode = 409; // Conflict
        }
    } else if (error instanceof Error) {
        // Check if it's an email sending error (this depends on how sendEmail throws errors)
        if (error.message.includes('Failed to send email')) { // Example check
            // Even if email fails, user is created. Decide on UX.
            // Maybe return a specific message but still 201, or a different error code.
            // For now, let's make it a server error but log it specifically.
            console.error("Email sending failed during registration:", error.message);
            errorMessage = "User registered, but we couldn't send the verification email. Please try requesting a new one or contact support.";
            // Return 201 but with a specific message about email failure:
            return NextResponse.json(
              {
                message: errorMessage,
                user: { /* user data without sensitive info */ }, // You'd need to fetch newUser again or construct it
              },
              { status: 201 } // Or 207 Multi-Status if part of it failed
            );
        } else {
             errorMessage = error.message;
        }
    }
    
    return NextResponse.json(
      { message: 'Registration Error', error: errorMessage, details: String(error) }, // Include more details for debugging
      { status: statusCode }
    );
  }
}