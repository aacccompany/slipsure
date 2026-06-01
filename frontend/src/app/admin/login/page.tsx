'use client';

import React, { useActionState } from 'react';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';
import { adminLogin } from './actions';

export default function AdminLoginPage() {
  const [state, action, isPending] = useActionState(adminLogin, null);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-blue-900 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-mono text-sm font-bold text-zinc-900 tracking-tight">
            FLOWSLIP <span className="text-zinc-400">/ ADMIN</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 p-8">
          <h1 className="text-xl font-black text-zinc-900 tracking-tight mb-1">Admin sign in</h1>
          <p className="text-sm text-zinc-500 mb-8">Internal access only. Not for customer accounts.</p>

          <form action={action} className="space-y-5">

            {/* Error */}
            {state?.error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="admin@flowslip.ai"
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-800 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-800 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-900 text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-6">
          FLOWSLIP Admin — Restricted Access
        </p>
      </div>
    </div>
  );
}
