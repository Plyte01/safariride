// src/app/auth/forgot-password/page.tsx
"use client";
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Suspense } from "react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset.');
      }
      setMessage(data.message);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Forgot Your Password?</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          No worries! Enter your email address below and we&#39;ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">{message}</div>}
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required className="input-form w-full mt-1" placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-70">
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          Remember your password? <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading form...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}