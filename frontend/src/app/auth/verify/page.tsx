'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

function VerifyEmailContent() {
  const { verifyOTP } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) return;

    setIsLoading(true);
    setError('');

    try {
      await verifyOTP(email, otp);
      toast.success('Email verified successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError('');
    setCountdown(60);
    setCanResend(false);

    try {
      const { api } = await import('@/lib/api-client');
      await api.resendOTP(email);
      toast.success('New code sent to your email!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg";
  const labelClass = "block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← FLOWSLIP
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Verify Email</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-blue-700">● </span>CHECK YOUR INBOX
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8 space-y-5">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600">
                We've sent a 6-digit code to <span className="font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={`${inputClass} text-center tracking-[0.5em] font-mono text-lg`}
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Email →'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest hover:text-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-zinc-100">
              <p className="text-xs text-zinc-500 text-center">
                Wrong email?{' '}
                <Link href="/login" className="text-zinc-900 hover:underline font-medium">
                  Change email address
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          © 2026 FLOWSLIP
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
