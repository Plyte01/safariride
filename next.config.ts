// next.config.ts
import type { NextConfig } from "next";
import NextPWA from "next-pwa"; // Import next-pwa

// Determine if the environment is development or production
const isDev = process.env.NODE_ENV !== 'production';

// Configure the PWA plugin options
const pwaConfig = {
  dest: 'public', // Destination directory for service worker and other PWA files
  register: true, // Register the service worker
  skipWaiting: true, // Skip waiting for service worker activation
  disable: isDev, // Disable PWA in development for better DX
  // scope: '/', // Optional: Define the scope of your PWA, default is '/'
  // sw: 'sw.js', // Optional: Custom service worker file name
  
  // Example Fallbacks for offline access (create these pages/assets)
  fallbacks: {
    document: '/offline',         // app/offline/page.tsx
    image: '/icons/fallback-image.png', // public/icons/fallback-image.png
    font: '/fonts/fallback-font.woff2', // Provide a fallback font or use an existing one
    audio: '/audio/offline-track.mp3',  // Provide a fallback audio or use an existing one
    video: '/videos/offline-promo.mp4', // Provide a fallback video or use an existing one
  },

  // Example Runtime Caching Strategies (using Workbox)
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i, // Cache images from Cloudinary
      handler: 'CacheFirst' as const, // Use 'as const' for type safety with Workbox strategies
      options: {
        cacheName: 'cloudinary-images',
        expiration: {
          maxEntries: 150, // Max number of images to cache
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: { // Ensure we only cache successful responses
          statuses: [0, 200], // 0 for opaque responses (cross-origin)
        },
      },
    },
    {
      urlPattern: /\/api\//, // Example for your API routes
      handler: 'NetworkFirst' as const,
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 1 * 24 * 60 * 60, // 1 Day
        },
        cacheableResponse: { statuses: [0, 200] },
        networkTimeoutSeconds: 10, // How long to wait for network before falling back to cache
      },
    },
    {
      urlPattern: /.*/, // Default for all other requests (e.g., pages, static assets not precached)
      handler: 'NetworkFirst' as const, // Or 'StaleWhileRevalidate'
      options: {
        cacheName: 'others',
        expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
  // You can add more PWA options here, like:
  // Exclude specific routes from being precached
  // exclude: [
  //   /\/api\/admin\/.*/, // Exclude admin API routes from precaching
  //   /\/admin\/.*/,      // Exclude admin pages from precaching (if they should always be fresh)
  // ],
  // buildExcludes: [/middleware-manifest\.json$/] // Example to exclude certain build files
};

// Your existing Next.js configurations
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Add any other Next.js specific configurations here
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        // port: '', // Optional
        // pathname: '/your-cloud-name/image/upload/**', // Optional, more specific path
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Add other image domains your app uses
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google Sign-In avatars
      }
    ],
  },
};

// Wrap your Next.js config with the PWA plugin
const withPWA = NextPWA(pwaConfig);

export default withPWA(nextConfig as any);