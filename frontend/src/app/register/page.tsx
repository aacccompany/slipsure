'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/services/authApi';
import axios from 'axios';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register({ name, email, password, phone: phone || undefined });
      toast.success('Account created! Please verify your email.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Registration failed. Please try again.'
        : 'Registration failed. Please try again.';
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
          <Link href="/" className="font-mono text-sm font-bold text-zinc-900 tracking-tight block mb-6">
            ← FLOWSLIP
          </Link>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Create Account</h1>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mt-1">
            <span className="text-emerald-600">● </span>NEW MERCHANT
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                  required
                />
              </div>
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
                <label className={labelClass}>Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>

        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
