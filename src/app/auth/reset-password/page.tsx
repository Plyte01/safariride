// src/app/auth/reset-password/page.tsx
"use client";
import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false); // Could pre-validate token if desired

  useEffect(() => {
    // Basic check if token and email are present in URL
    if (!token || !email) {
      setError("Invalid password reset link. Missing required parameters.");
    } else {
        setIsValidToken(true); // Assume valid for now, API will do final check
    }
  }, [token, email]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !email) {
      setError("Invalid link parameters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }
      setMessage(data.message + " You will be redirected to login shortly.");
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && !error) { // If token/email missing and no explicit error yet
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
                <p className="text-gray-700 mb-6">The password reset link is incomplete or invalid.</p>
                <Link href="/auth/forgot-password" className="btn-primary">Request a New Link</Link>
            </div>
        </div>
      );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Your Password</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">{message}</div>}
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
          
          {!message && ( // Only show form if no success message
            <>
              <input type="hidden" name="token" value={token || ''} />
              <input type="hidden" name="email" value={email || ''} />
              <div>
                <label htmlFor="passwordS" className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required className="input-form w-full mt-1" placeholder="Enter new password"
                />
              </div>
              <div>
                <label htmlFor="confirmPasswordS" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  required className="input-form w-full mt-1" placeholder="Confirm new password"
                />
              </div>
              <button type="submit" disabled={isLoading || !token || !email} className="w-full btn-primary disabled:opacity-70">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
          {message && ( // Show login link on success
             <Link href="/auth/login" className="w-full btn-primary inline-block text-center">Proceed to Login</Link>
          )}
        </form>
         {!message && (
            <p className="mt-6 text-center text-sm">
            Remembered your password? <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
            </p>
         )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}