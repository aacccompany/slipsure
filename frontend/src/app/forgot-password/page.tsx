'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/services/authApi';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Failed to send reset code. Please try again.'
        : 'Failed to send reset code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg";
  const labelClass = "block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="mb-8">
          <Link href="/login" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← Back to Login
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Reset Password</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-amber-500">● </span>RECOVERY
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8 space-y-5">
            {sent ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="font-mono text-[11px] text-zinc-500 text-center uppercase tracking-wider">
                    Reset code sent to<br />
                    <span className="text-zinc-900 font-semibold">{email}</span>
                  </p>
                </div>
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="block w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors text-center rounded-lg"
                >
                  Enter Reset Code →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="font-mono text-[11px] text-zinc-500">
                  Enter your email and we&apos;ll send you a reset code.
                </p>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={inputClass}
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-xs">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
