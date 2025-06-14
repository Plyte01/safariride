// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'; // Ensure Viewport is imported
import { Inter } from 'next/font/google';
import './globals.css';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner'; // Assuming this path is correct for your Sonner component
// import Footer from '@/components/Footer'; // Optional

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Using Inter as a CSS variable
});

// --- PWA & SEO Enhanced Metadata ---
export const metadata: Metadata = {
  // Existing Metadata
  title: {
    default: 'SafariRide - Your Adventure Awaits',
    template: '%s | SafariRide',
  },
  description: 'Find and rent the perfect car for your next safari, road trip, or adventure in East Africa. Easy, reliable, and affordable car rentals with SafariRide.',
  keywords: ['car rental Kenya', 'car hire', 'adventure vehicles', 'rent a car', '4x4 rental East Africa', 'car booking app', 'SafariRide', 'car rental East Africa', 'safari vehicle rental', 'off-road car rental', 'luxury car rental'],
  
  // Enhanced metadata
  metadataBase: new URL('https://www.safariride.com'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // PWA Specific Metadata
  manifest: '/manifest.json',

  // Apple PWA Meta Tags
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafariRide",
  },

  // Enhanced Open Graph metadata
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.safariride.com',
    title: 'SafariRide - Car Rentals for Your Adventure',
    description: 'Discover and book unique cars for your travels with SafariRide. The best car rental platform in East Africa for safaris and adventures.',
    siteName: 'SafariRide',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SafariRide - Your Adventure Car Rental Platform',
      },
    ],
  },
  
  // Enhanced Twitter Card metadata
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'SafariRide - Adventure Car Rentals',
  //   description: 'Rent unique cars for your next adventure in East Africa. The best car rental platform for safaris and road trips.',
  //   images: ['/twitter-card-image.png'],
  // },

  // Enhanced Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

// --- PWA Viewport Configuration ---
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1D4ED8' },
  ],
  // Common viewport settings
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Optional: Prevents zooming, common for app-like PWAs
  // userScalable: false, // Optional: Also prevents zooming
  colorScheme: 'light', // Informs browser about supported color schemes
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen selection:bg-blue-500 selection:text-white`}
        // Added font-sans assuming --font-inter is your sans-serif base in tailwind.config.js
        // Added selection styles for better UX
      >
        <AuthProvider>
          <div className="flex flex-col flex-1 site-wrapper"> {/* Added site-wrapper for potential further global styling */}
            <Navbar />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-grow">
              {/* Adjusted padding for different screen sizes */}
              {children}
            </main>
            <Footer />
          </div>
          <Toaster richColors position="top-right" closeButton duration={5000} /> {/* Added duration for Sonner */}
        </AuthProvider>
      </body>
    </html>
  );
}