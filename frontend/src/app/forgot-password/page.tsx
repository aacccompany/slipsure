'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true); setError('');
    try {
      await api.forgotPassword({ email });
      setSent(true);
      toast.success('Reset code sent!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <Link href="/login"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← Back to Login
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-1" style={{ color: 'var(--navy)' }}>
            Reset Password
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
              Account Recovery
            </span>
          </div>
        </div>

        <div className="bg-white p-8 space-y-5" style={{ border: '1px solid var(--border)' }}>
          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 flex items-center justify-center"
                  style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
                  <span style={{ color: 'var(--gold)', fontSize: 24 }}>✓</span>
                </div>
                <p className="font-mono text-[11px] text-center uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Reset code sent to<br />
                  <span className="font-bold" style={{ color: 'var(--navy)' }}>{email}</span>
                </p>
              </div>
              <Link href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="block w-full py-3 text-sm font-semibold text-center transition-all hover:opacity-90"
                style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                Enter Reset Code <span style={{ color: 'var(--gold)' }}>→</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Enter your email and we&apos;ll send you a reset code.
              </p>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" required
                  className="w-full px-4 py-3 border text-sm transition-colors placeholder:opacity-40 focus:outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <p className="text-xs text-rose-600">{error}</p>
                </div>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Code <span style={{ color: 'var(--gold)' }}>→</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
