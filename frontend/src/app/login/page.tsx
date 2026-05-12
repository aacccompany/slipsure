'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Lock, User, ArrowRight, Loader2, AlertCircle, MessageSquare, Key } from 'lucide-react';
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
    
    // Mock Email Send
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsOtpSent(true);
    setIsLoading(false);
    toast.success('Access code sent to your email!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock Authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (mode === 'otp') {
      if (otp === '123456') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('accessToken', 'mock_jwt_token_otp');
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        const msg = 'Invalid code. Please check your email.';
        setError(msg);
        toast.error(msg);
        setIsLoading(false);
      }
    } else {
      // Mock Password Check (accept any password for demo)
      if (password.length >= 6) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('accessToken', 'mock_jwt_token_password');
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        const msg = 'Password must be at least 6 characters.';
        setError(msg);
        toast.error(msg);
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
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 hero-gradient">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6 transition-transform hover:scale-105">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-zinc-900">
              FlowSlip<span className="text-emerald-600">.ai</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Merchant Access</h1>
          <p className="text-zinc-500 font-medium text-sm mt-2">
            Secure verification for modern businesses.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-emerald-600/5">
          
          {/* Mode Switcher */}
          {!isOtpSent && (
            <div className="flex p-1 bg-zinc-100 rounded-2xl mb-8">
              <button 
                onClick={() => { setMode('password'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'password' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}
              >
                Password Login
              </button>
              <button 
                onClick={() => { setMode('otp'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'otp' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}
              >
                Access Code
              </button>
            </div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Email Address</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
                  <Link href="#" className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <>
              {!isOtpSent ? (
                <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Email Address</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Access Code <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Verification Code</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-center tracking-[0.5em]"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center mt-2">We sent a code to {email}</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-xs font-bold">{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enter"}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="w-full text-zinc-400 text-xs font-bold hover:text-zinc-600 transition-colors"
                  >
                    Change Email
                  </button>
                </form>
              )}
            </>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-white px-4 text-zinc-300">Social Connect</span>
            </div>
          </div>

          <button 
            onClick={handleLineLogin}
            className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-sm hover:brightness-105 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/5"
          >
            <MessageSquare className="w-5 h-5 fill-current" />
            Continue with LINE
          </button>
        </div>

        <p className="text-center mt-10 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            © 2026 FlowSlip.Ai - Bank-Grade Security
        </p>
      </div>
    </div>
  );
}
