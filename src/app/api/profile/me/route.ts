import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, image } = body; // Expecting 'name' and 'image' (Cloudinary URL)
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!currentUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};


    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
        return NextResponse.json({ message: 'Name must be between 2 and 50 characters.' }, { status: 400 });
      }
      dataToUpdate.name = name.trim();
    }

    if (image !== undefined) {
      if (image === null || (typeof image === 'string' && image.trim() === '')) {
        dataToUpdate.image = null; // Allow removing profile picture
      } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        dataToUpdate.image = image;
      } else if (image !== null) { // If image is provided but not a valid URL or null to clear
          return NextResponse.json({ message: 'Invalid image URL provided.' }, { status: 400 });
      }
    }
    
    // Password change would be handled by a separate, more secure endpoint due to currentPassword verification.

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No fields to update provided.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
      select: { // Return only necessary fields
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        // emailVerified: true,
        // createdAt: true,
        // isTrustedOwner: true,
      }
    });

    // IMPORTANT: If name or image is updated, the NextAuth.js session token
    // will still hold the OLD data until the user signs out and signs back in,
    // or until their session is refreshed.
    // You might need to trigger a session update manually if using `update` callback from NextAuth.js
    // or instruct the user that changes will reflect fully on next login.
    // For immediate UI update, the client will use the response from this PATCH.

    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error) {
    console.error('Failed to update user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ message: 'Failed to update profile', details: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true, // Profile picture URL
        role: true,
        isTrustedOwner: true,
        createdAt: true,
        // You can include counts or recent items if needed for a profile summary
        // _count: {
        //   select: {
        //     bookings: { where: { status: { notIn: ['CANCELLED', 'COMPLETED'] } } }, // Active bookings count
        //     cars: { where: { isListed: true, isActive: true } } // Active cars count for owners
        //   }
        // }
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json({ message: 'Failed to fetch profile data', details: String(error) }, { status: 500 });
  }
}