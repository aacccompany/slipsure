'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

type LoginMode = 'otp' | 'password';

function LoginContent() {
  const { login, lineLogin, isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const router = useRouter();
  const lineCallbackHandledRef = React.useRef(false);

  const getLineRedirectUri = () => {
    return process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;
  };

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Check if redirected from registration
  React.useEffect(() => {
    const registeredEmail = searchParams.get('email');
    if (registeredEmail) {
      setEmail(registeredEmail);
      setMode('otp');
      setIsOtpSent(true);
    }
  }, [searchParams]);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const lineError = searchParams.get('error_description') || searchParams.get('error');

    if (lineError) {
      setError(lineError);
      return;
    }

    if (!code || state !== 'login' || lineCallbackHandledRef.current) {
      return;
    }

    lineCallbackHandledRef.current = true;
    setIsLoading(true);
    setError('');

    lineLogin(code, getLineRedirectUri()).catch((err) => {
      setError(err instanceof Error ? err.message : 'LINE login failed');
      setIsLoading(false);
    });
  }, [lineLogin, searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      await api.resendOTP(email);
      setIsOtpSent(true);
      toast.success('Access code sent to your email!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'otp') {
        // For OTP mode, redirect to verify page
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const handleLineLogin = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;

    if (!channelId || channelId === 'your_line_login_channel_id_here') {
      toast.error('LINE login channel ID is not configured');
      return;
    }

    const redirectUri = getLineRedirectUri();
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=login&scope=profile%20openid%20email`;
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg";
  const labelClass = "block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2";
  const isLineLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_LINE_LOGIN !== 'false';

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Merchant Access</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-blue-700">● </span>PORTAL ONLINE
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8 space-y-5">
            {mode === 'password' ? (
              <form onSubmit={handleLogin} className="space-y-5">
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
                <div>
                  <div className="flex justify-between mb-2">
                    <label className={labelClass}>Password</label>
                    <Link href="/forgot-password" className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest hover:text-zinc-900">Forgot?</Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
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
                  disabled={isLoading}
                  className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In →'}
                </button>
              </form>
            ) : !isOtpSent ? (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Access Code →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className={labelClass}>Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    className={`${inputClass} text-center tracking-[0.5em] font-mono`}
                    maxLength={6}
                    required
                  />
                  <p className="font-mono text-[10px] text-zinc-400 mt-2">Sent to {email}</p>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-200 px-4 py-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-xs">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-800 text-white py-3 text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enter →'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors font-mono uppercase tracking-widest"
                >
                  Change Email
                </button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 font-mono text-[10px] text-zinc-300 uppercase tracking-widest">or</span>
              </div>
            </div>

            {isLineLoginEnabled && (
              <button
                onClick={handleLineLogin}
                disabled={isLoading}
                className="w-full bg-[#06C755] text-white py-3 text-sm font-medium hover:brightness-105 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                Continue with LINE
              </button>
            )}
          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          No account? <Link href="/register" className="text-zinc-900 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
