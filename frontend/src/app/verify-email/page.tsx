'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/services/authApi';
import axios from 'axios';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await authApi.verifyOTP(email, otp);
      localStorage.setItem('accessToken', res.data.access_token);
      localStorage.setItem('refreshToken', res.data.refresh_token);
      localStorage.setItem('isLoggedIn', 'true');
      toast.success('Email verified! Setting up your account…');
      router.push('/onboarding');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Verification failed. Please try again.'
        : 'Verification failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      await authApi.resendOTP(email);
      toast.success('New code sent to your email!');
      setResendCooldown(60);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Failed to resend code.'
        : 'Failed to resend code.';
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg";
  const labelClass = "block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="mb-8">
          <Link href="/" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← FLOWSLIP
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <MailCheck className="w-6 h-6 text-blue-800" />
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Verify Email</h1>
          </div>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">
            <span className="text-amber-500">● </span>CHECK YOUR INBOX
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8 space-y-5">
            {email && (
              <p className="font-mono text-[11px] text-zinc-500">
                A 6-digit code was sent to <span className="text-zinc-900 font-semibold">{email}</span>
              </p>
            )}
            <form onSubmit={handleVerify} className="space-y-5">
              {!email && (
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
              )}
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
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-xs">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue →'}
              </button>
            </form>

            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors font-mono uppercase tracking-widest disabled:opacity-60"
            >
              {isResending ? (
                <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Sending…</span>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          Wrong email?{' '}
          <Link href="/register" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
            Back to Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
