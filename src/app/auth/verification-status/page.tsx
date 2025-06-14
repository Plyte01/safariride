// src/app/auth/verification-status/page.tsx
"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Suspense } from "react";
import { toast } from 'react-hot-toast';

function VerificationStatusForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);

  let title = "Email Verification";
  let message = "Processing your verification...";
  const isError = !success;

  if (success) {
    title = "Email Verified!";
    message = "Your email address has been successfully verified. You can now log in to your account.";
  } else if (error) {
    title = "Verification Failed";
    switch (error) {
      case 'missing_params':
        message = "Verification link is incomplete. Please try again or contact support.";
        break;
      case 'invalid_token':
        message = "Invalid or already used verification token. Please request a new verification email if needed.";
        break;
      case 'expired_token':
        message = "Your verification link has expired. Please request a new one.";
        break;
      default:
        message = "An unexpected error occurred during email verification. Please try again later or contact support.";
    }
  }

  useEffect(() => {
    if (success) {
        setTimeout(() => {
            router.push('/auth/login');
        }, 3000); // Redirect to login after 3 seconds
    }
  }, [success, router]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Email address is required to resend verification.");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend verification email.");
      }

      toast.success("Verification email has been sent. Please check your inbox.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className={`text-3xl font-bold mb-4 ${isError ? 'text-red-600' : 'text-green-600'}`}>
          {title}
        </h1>
        <p className="text-gray-700 mb-6">{message}</p>
        {isError && error === 'expired_token' && (
          <div className="mb-6">
            <button 
              onClick={handleResendVerification}
              disabled={isResending || !email}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>
            {!email && (
              <p className="mt-2 text-sm text-red-600">
                Please contact support to resend your verification email.
              </p>
            )}
          </div>
        )}
        <Link 
          href={success ? "/auth/login" : "/"} 
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {success ? "Proceed to Login" : "Back to Home"}
        </Link>
      </div>
    </div>
  );
}

export default function VerificationStatusPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VerificationStatusForm />
    </Suspense>
  );
}
