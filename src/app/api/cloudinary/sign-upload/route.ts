import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // Adjust path

// Configure Cloudinary SDK (should only be done once)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { folder?: string; public_id?: string; tags?: string[] };
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign: Record<string, string | number | string[]> = {
      timestamp: timestamp,
      // eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', // Example eager transformations
      // folder: 'safariride/cars', // Default folder for car images
    };

    if (body.folder && typeof body.folder === 'string') {
        paramsToSign.folder = body.folder;
    } else {
        paramsToSign.folder = `safariride/cars/${session.user.id}`; // User-specific folder
        paramsToSign.folder = `safariride/user_uploads/${session.user.id}`; 
    }

    if (body.public_id) {
        paramsToSign.public_id = body.public_id; // Allow client to suggest a public_id
    }
    if (body.tags) {
        paramsToSign.tags = body.tags;
    }

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET! // Ensure your API secret is non-null
    );

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY, // Send API key to client for upload
      cloudName: process.env.CLOUDINARY_CLOUD_NAME, // Send cloud name
      folder: paramsToSign.folder, // Send back the determined folder
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    return NextResponse.json({ message: 'Failed to generate upload signature', details: String(error) }, { status: 500 });
  }
}