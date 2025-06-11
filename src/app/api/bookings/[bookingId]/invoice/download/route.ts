import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client';
import puppeteer, { LaunchOptions } from 'puppeteer-core'; // <--- USE puppeteer-core
import chromium from '@sparticuz/chromium-min'; // <--- IMPORT THIS
import { getInvoiceHTML } from '@/lib/invoiceTemplate'; // Adjust path if necessary

// Determine executable path based on environment
const getBrowserExecutablePath = async () => {
    if (process.env.NODE_ENV === 'production') {
        // For Vercel or similar serverless environments, use @sparticuz/chromium-min
        return await chromium.executablePath();
    }
    // For local development, Puppeteer typically finds its downloaded Chromium.
    // If not, you might need to specify the path to your local Chrome/Chromium.
    // Example for Windows, adjust if needed:
    // return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    // For macOS:
    // return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    // For Linux:
    // return '/usr/bin/google-chrome-stable'; // or wherever chrome is installed
    // Fallback to puppeteer's default if unsure (might download Chromium on first run)
    const puppeteerDefault = (await import('puppeteer')).executablePath();
    return puppeteerDefault;
};


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getServerSession(authOptions);
  // Allow renter or owner of the car, or admin to download
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookingId } = await params;
    const bookingData = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: { include: { owner: { select: { name: true, email: true } } } },
        user: { select: { name: true, email: true } }, // Renter
        payment: true,
      },
    });

    if (!bookingData) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    // Define a type for the session user with role and id
    type SessionUser = {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
    };

    const user = session.user as SessionUser;

    // Authorization: Check if current user is the renter, car owner, or an admin
    const isAdmin = user.role === UserRole.ADMIN;
    const isRenter = bookingData.userId === user.id;
    const isCarOwner = bookingData.car.ownerId === user.id;

    if (!isAdmin && !isRenter && !isCarOwner) {
      return NextResponse.json({ message: 'Forbidden: You do not have permission to view this invoice.' }, { status: 403 });
    }
    
    // Fetch platform settings for invoice branding (optional)
    const platformNameSetting = await prisma.platformSetting.findUnique({ where: { key: 'PLATFORM_NAME' }});
    // ... fetch other settings like address, contact ...

    const invoiceHtml = getInvoiceHTML({
        ...bookingData,
        platformName: platformNameSetting?.value || 'SafariRide',
        // Pass other platform details
    });
    
    let browser = null;
    let pdfBuffer: Buffer;
    try {
      const executablePath = await getBrowserExecutablePath();
      const launchOptions: LaunchOptions & { product?: string } = {
          headless: true, // 'new' for newer puppeteer versions, true for older
          args: process.env.NODE_ENV === 'production' ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
      };
      if (executablePath) { // Only set executablePath if we have one (especially for @sparticuz/chromium)
          launchOptions.executablePath = executablePath;
      }
      
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });
      // await page.emulateMediaType('screen'); // Optional
      const pdfUint8Array = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      pdfBuffer = Buffer.from(pdfUint8Array);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${bookingData.id.substring(0,8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error(`Failed to generate invoice for booking ${(await params).bookingId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to generate invoice', details: errorMessage }, { status: 500 });
  }
}