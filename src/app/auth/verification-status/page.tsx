// src/app/auth/verification-status/page.tsx
"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { Suspense } from "react";

function VerificationStatusForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');

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


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className={`text-3xl font-bold mb-4 ${isError ? 'text-red-600' : 'text-green-600'}`}>
          {title}
        </h1>
        <p className="text-gray-700 mb-6">{message}</p>
        {isError && error === 'expired_token' && (
          <p className="mb-6">
            {/* TODO: Add button/link to resend verification email */}
            {/* <button className="btn-secondary">Resend Verification Email</button> */}
          </p>
        )}
        <Link href={success ? "/auth/login" : "/"} className="btn-primary">
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
