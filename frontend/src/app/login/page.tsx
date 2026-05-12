'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type LoginMode = 'otp' | 'password';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsOtpSent(true);
    setIsLoading(false);
    toast.success('Access code sent to your email!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 800));

    if (mode === 'otp') {
      if (otp === '123456') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('accessToken', 'mock_jwt_token_otp');
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        const msg = 'Invalid code. Please check your email.';
        setError(msg);
        setIsLoading(false);
      }
    } else {
      if (password.length >= 6) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('accessToken', 'mock_jwt_token_password');
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        const msg = 'Password must be at least 6 characters.';
        setError(msg);
        setIsLoading(false);
      }
    }
  };

  const handleLineLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('accessToken', 'mock_jwt_token_line');
      toast.success('Login successful with LINE!');
      router.push('/dashboard');
    }, 800);
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-400 rounded-lg";
  const labelClass = "block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← FLOWSLIP
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Merchant Access</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-blue-700">● </span>PORTAL ONLINE
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">

          {/* Mode Switcher */}
          {!isOtpSent && (
            <div className="flex border-b border-zinc-200">
              {(['password', 'otp'] as LoginMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                    mode === m
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {m === 'password' ? 'Password' : 'Access Code'}
                </button>
              ))}
            </div>
          )}

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
                    <Link href="#" className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest hover:text-zinc-900">Forgot?</Link>
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

            <button
              onClick={handleLineLogin}
              className="w-full bg-[#06C755] text-white py-3 text-sm font-medium hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              Continue with LINE
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          © 2026 FLOWSLIP
        </p>
      </div>
    </div>
  );
}
