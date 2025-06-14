// src/app/auth/login/page.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, FormEvent, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserRole } from '@prisma/client'; // Your Prisma enum for roles
import { Suspense } from "react";

// Icons (ensure react-icons is installed: npm install react-icons)
import { FiAlertTriangle, FiCheckCircle, FiLogIn } from 'react-icons/fi';
// Using a generic SVG for Google, you can replace with react-icons if preferred
const GoogleIcon = () => (
    <svg className="h-5 w-5 group-hover:opacity-90 mr-2 -ml-1" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" >
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);
const LoadingSpinner = ({ color = "text-current" }: { color?: string }) => (
    <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For general login errors
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Effect to display error messages from NextAuth redirects (e.g., OAuth failures)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
        // Clear other messages when a new error from URL comes in
        setShowResendVerification(false);
        setResendStatusMessage(null);
        if (errorParam === "OAuthAccountNotLinked") {
            setErrorMessage("This email is associated with an account using a different sign-in method. Please use that method, or if you used Google before, ensure you're using the same Google account.");
        } else if (errorParam === "AccessDenied") {
            setErrorMessage("Access Denied. Your OAuth sign-in might have been cancelled or you lack permissions.");
        } else if (errorParam === "Verification") { // Custom error code if email provider verification fails
            setErrorMessage("Email verification failed. The link might be invalid or expired.");
        }
        else {
            setErrorMessage(`Login failed: ${errorParam}. Please try again.`);
        }
    }
  }, [searchParams]);

  const handleSubmitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setResendStatusMessage(null);
    setShowResendVerification(false);
    setIsLoadingCredentials(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        console.log("SignIn Error from Credentials:", result.error);
        if (result.error === "VERIFY_EMAIL") { // Updated error code to match authOptions.ts
            setErrorMessage("Your email address is not verified.");
            setShowResendVerification(true);
        } else if (result.error === "CredentialsSignin") {
            setErrorMessage("Invalid email or password. Please check your credentials.");
        } else {
            setErrorMessage(result.error); // Display other NextAuth errors directly
        }
      } else if (result?.ok) {
        const session = await getSession(); // Fetch session to get user role after successful signIn
        if (session && session.user) {
          type SessionUserWithRole = typeof session.user & { role?: UserRole };
          const userRole = (session.user as SessionUserWithRole).role as UserRole;
          const callbackUrl = searchParams.get('callbackUrl') || 
                              (userRole === UserRole.ADMIN ? '/admin/dashboard' :
                               userRole === UserRole.OWNER ? '/owner/dashboard' : '/');
          router.push(callbackUrl);
          router.refresh(); 
        } else {
          // Should not happen if signIn was ok and session is configured
          setErrorMessage("Login successful, but failed to retrieve user details. Redirecting to home.");
          router.push('/');
          router.refresh();
        }
      } else {
        setErrorMessage("An unknown login error occurred. Please try again.");
      }
    } catch (err) {
      console.error('Login page credentials error:', err);
      setErrorMessage('Login failed due to an unexpected error.');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    setShowResendVerification(false);
    setResendStatusMessage(null);
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    // signIn for OAuth will handle the full redirect flow.
    // Errors are typically handled by redirecting to an error page or back with error query param.
    signIn('google', { callbackUrl, redirect: true }).catch(err => {
        // This catch block might not be very effective for redirect flows,
        // as errors often result in redirects handled by NextAuth.
        console.error("Google Sign-In initiation client-side error:", err);
        setErrorMessage("Could not initiate Google Sign-In. Please ensure pop-ups are allowed and try again.");
        setIsLoadingGoogle(false);
    });
    // If signIn doesn't immediately redirect (e.g. due to an issue caught client-side before redirect),
    // this might be needed, but usually not for OAuth.
    // setTimeout(() => setIsLoadingGoogle(false), 5000); // Fallback to re-enable button
  };

  const handleResendVerification = async () => {
    if (!email) {
      setResendStatusMessage({ type: 'error', text: "Please enter your email address in the field above to resend verification."});
      return;
    }
    setIsResending(true);
    setErrorMessage(null);
    setResendStatusMessage(null);
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
      setResendStatusMessage({ type: 'success', text: data.message });
      setShowResendVerification(false); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setResendStatusMessage({ type: 'error', text: message });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link href="/">
            <Image className="h-12 w-auto" src="/logo.svg" alt="logo" width={48} height={48} priority />
          </Link>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your SafariRide account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
              create a new account
            </Link>
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-xl p-8 space-y-6">
          {/* General Error Display Area */}
          {errorMessage && !showResendVerification && (
            <div role="alert" className="alert alert-error">
              <FiAlertTriangle className="alert-icon" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Resend Verification UI */}
          {showResendVerification && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm space-y-3">
                <div className="flex items-start">
                    <FiAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>{errorMessage || "Your email needs verification."}</p>
                </div>
              <button
                onClick={handleResendVerification}
                disabled={isResending || !email}
                className="w-full btn-secondary text-sm py-2 disabled:opacity-70"
              >
                {isResending ? <LoadingSpinner color="text-yellow-800"/> : 'Resend Verification Email'}
              </button>
            </div>
          )}
          {resendStatusMessage && (
            <div role="alert" className={`alert ${resendStatusMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {resendStatusMessage.type === 'success' ? <FiCheckCircle className="alert-icon" /> : <FiAlertTriangle className="alert-icon" />}
              <p>{resendStatusMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmitCredentials} className="space-y-6">
            <div>
              <label htmlFor="emailLogin" className="label-form">Email address</label>
              <input
                id="emailLogin" name="email" type="email" autoComplete="email" required
                className="input-form w-full mt-1" placeholder="you@example.com"
                value={email} onChange={(e) => { setEmail(e.target.value); setShowResendVerification(false); setResendStatusMessage(null); setErrorMessage(null); }} 
                disabled={isLoadingCredentials || isLoadingGoogle || isResending}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="passwordLogin" className="label-form">Password</label>
                <div className="text-sm">
                  <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <input
                id="passwordLogin" name="password" type="password" autoComplete="current-password" required
                className="input-form w-full mt-1" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} 
                disabled={isLoadingCredentials || isLoadingGoogle || isResending}
              />
            </div>

            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
            </div>

            <div>
              <button type="submit" disabled={isLoadingCredentials || isLoadingGoogle || isResending}
                className="w-full btn-primary-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center group">
                {isLoadingCredentials ? <LoadingSpinner color="text-white"/> : <FiLogIn className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                Sign In
              </button>
            </div>
          </form>

          {/* Social Logins Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <button type="button" onClick={handleGoogleSignIn} disabled={isLoadingCredentials || isLoadingGoogle || isResending}
                className="w-full social-btn group">
                {isLoadingGoogle ? <LoadingSpinner color="text-gray-700"/> : <GoogleIcon />}
                Sign in with Google
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don&#39;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner color="text-blue-600" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
