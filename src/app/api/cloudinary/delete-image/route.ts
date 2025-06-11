// src/app/api/cloudinary/delete-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path
import { UserRole } from '@prisma/client'; // Assuming you have Role enum

// Define a type for the session user that includes 'id' and 'role'
type SessionUser = {
  id: string;
  role: UserRole;
  [key: string]: unknown; // Allow other properties if needed
};


// Ensure Cloudinary is configured (should be done once, typically in a config file or at app startup)
// However, for serverless functions, it's common to configure it per invocation if not globally memoized.
if (!cloudinary.config().cloud_name) { // Configure only if not already configured
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}


// Define your expected folder prefix for car images. This helps in authorization.
// Example: "safariride/cars"
const CAR_IMAGE_FOLDER_PREFIX = `safariride/cars`; 

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized: Not logged in' }, { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const { public_id, resource_type = 'image' } = requestBody as { public_id: string; resource_type?: 'image' | 'video' | 'raw' };
  const userId = session.user.id;
  const userRole = (session.user as SessionUser).role;
  if (!public_id || typeof public_id !== 'string' || public_id.trim() === '') {
    return NextResponse.json({ message: 'Missing or invalid "public_id"' }, { status: 400 });
  }

  // 2. Enhanced Authorization Logic

  // Admins can delete any resource (with caution)
  if (userRole !== UserRole.ADMIN) {
    // For non-admins, check if the public_id seems to belong to them based on folder structure.
    // This assumes your public_ids for car images are structured like:
    // CAR_IMAGE_FOLDER_PREFIX/USER_ID/actual_file_name_or_random_id
    // e.g., "safariride/cars/cmf5jg1zv0000tq5jq8zg9z7q/my_car_image"
    
    const expectedUserSpecificPrefix = `${CAR_IMAGE_FOLDER_PREFIX}/${userId}/`;

    if (!public_id.startsWith(expectedUserSpecificPrefix)) {
      console.warn(`Forbidden delete attempt: User ${userId} (role: ${userRole}) tried to delete public_id "${public_id}" which does not match their expected prefix "${expectedUserSpecificPrefix}".`);
      return NextResponse.json({ message: 'Forbidden: You are not authorized to delete this resource.' }, { status: 403 });
    }
  } 
  // If Admin, they proceed without the prefix check (they have broader delete capabilities).
  // You might add logging for admin deletions for audit purposes.
  if (userRole === UserRole.ADMIN) {
      console.log(`Admin ${userId} is attempting to delete resource with public_id: ${public_id}`);
  }


  // 3. Call Cloudinary uploader.destroy
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type,
      invalidate: true, // Optional: aggressively invalidate CDN cache
    });

    // `result.result` can be 'ok', 'not found', or an error string.
    if (result.result === 'ok') {
      return NextResponse.json({ message: 'Image deleted successfully from Cloudinary.', public_id_deleted: public_id }, { status: 200 });
    } else if (result.result === 'not found') {
      // This is not necessarily an error for the client; the resource is gone.
      console.log(`Cloudinary resource not found for deletion (public_id: ${public_id}), assuming already deleted.`);
      return NextResponse.json({ message: 'Image not found on Cloudinary (possibly already deleted).', public_id_requested: public_id }, { status: 200 }); // Or 404 if you prefer to indicate not found
    } else {
      // This case handles other Cloudinary error strings in result.result
      console.error(`Cloudinary deletion failed for public_id "${public_id}":`, result);
      return NextResponse.json({ message: 'Cloudinary reported an error during deletion.', details: result.result }, { status: 500 });
    }

  } catch (error: unknown) {
    // This catches errors from the cloudinary.uploader.destroy call itself (e.g., network issues, config errors)
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    console.error(`Server error while attempting to delete Cloudinary image (public_id: ${public_id}):`, error);
    return NextResponse.json({ message: 'Server error during image deletion process.', details: errorMessage }, { status: 500 });
  }
}