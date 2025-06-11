// src/app/auth/error/page.tsx
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Suspense } from "react";



function AuthErrorForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const emailForResend = searchParams.get('email'); // If passed from signIn callback via VERIFY_EMAIL error

  const [resendStatus, setResendStatus] = useState<{ type: 'info' | 'error' | 'success', message: string } | null>(null);
  const [isResending, setIsResending] = useState(false);


  let title = "Authentication Error";
  let message = "An unknown error occurred. Please try again.";
  let showResendButton = false;

  switch (error) {
    case 'Signin':
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'EmailCreateAccount':
    case 'Callback':
    case 'OAuthAccountNotLinked':
      title = "Sign-In Problem";
      message = "There was an issue signing you in. This might be due to an existing account with the same email but a different sign-in method. Try signing in with the original method, or link your accounts if possible.";
      break;
    case 'EmailSignin':
      title = "Email Sign-In Failed";
      message = "Could not send the sign-in email. Please try again later.";
      break;
    case 'CredentialsSignin':
      title = "Login Failed";
      message = "Incorrect email or password. Please check your credentials and try again.";
      break;
    case 'VERIFY_EMAIL': // Custom error code from signIn callback
      title = "Email Verification Required";
      message = `Your email address (${emailForResend || 'provided'}) needs to be verified before you can log in. Please check your inbox (and spam folder) for the verification link.`;
      showResendButton = !!emailForResend;
      break;
    case 'AccessDenied':
        title = "Access Denied";
        message = "You do not have permission to access this page or resource.";
        break;
    // Add more specific NextAuth.js error codes as needed
    // https://next-auth.js.org/configuration/pages#error-page
    default:
      if (error) { // Display the error code if it's not a known one
        message = `Error: ${error}. Please try again or contact support if the issue persists.`;
      }
  }

  const handleResendVerification = async () => {
  if (!emailForResend) {
    setResendStatus({ type: 'error', message: 'Email not available for resend.' });
    return;
  }
  setIsResending(true);
  setResendStatus(null);
  try {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailForResend }),
    });
    const data = await response.json();
    if (!response.ok) {
      // Use message from API if available, otherwise a generic one
      throw new Error(data.message || "Failed to resend verification email. Please try again later.");
    }
    setResendStatus({ type: 'success', message: data.message });
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    setResendStatus({ type: 'error', message: errorMessage });
  } finally {
    setIsResending(false);
  }
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 px-4 text-center">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-16 h-16 mx-auto mb-6 ${error === 'VERIFY_EMAIL' ? 'text-yellow-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{title}</h1>
        <p className="text-gray-600 mb-8 text-sm md:text-base">{message}</p>

        {showResendButton && (
            <div className="mb-6">
                <button 
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="btn-secondary w-full md:w-auto disabled:opacity-70"
                >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
                {resendStatus && (
                    <p className={`mt-3 text-xs ${resendStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {resendStatus.message}
                    </p>
                )}
            </div>
        )}

        <div className="space-y-3">
            <button
                onClick={() => router.push('/auth/login')}
                className="w-full btn-primary"
            >
                Try Logging In Again
            </button>
            <Link href="/" className="block text-sm text-blue-600 hover:underline">
              Go to Homepage
            </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading form...</div>}>
      <AuthErrorForm />
    </Suspense>
  );
}