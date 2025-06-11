// src/app/offline/page.tsx
"use client"; // Can be a client component if you want interactivity, or server component for static content

import Link from 'next/link';
import { FiWifiOff } from 'react-icons/fi'; // Example icon

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 text-center p-6">
      <FiWifiOff className="w-20 h-20 text-slate-400 mb-6" />
      <h1 className="text-3xl font-bold text-slate-700 mb-3">You are Offline</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        It seems you&#39;ve lost your internet connection. Some features may not be available.
        Please check your connection and try again.
      </p>
      {/* Optional: Button to try reloading or link to homepage (which might be cached) */}
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try Reloading
      </button>
      <Link href="/" className="mt-4 text-sm text-blue-500 hover:underline">
        Go to Homepage
      </Link>
    </div>
  );
}