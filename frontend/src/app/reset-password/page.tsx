'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

const inputClass = 'w-full px-4 py-3 border text-sm transition-colors placeholder:opacity-40 focus:outline-none';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      await api.resetPassword({ email, otp, new_password: newPassword });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <Link href="/forgot-password"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← Back
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-1" style={{ color: 'var(--navy)' }}>
            New Password
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
              Password Reset
            </span>
          </div>
        </div>

        <div className="bg-white p-8 space-y-5" style={{ border: '1px solid var(--border)' }}>
          {success ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 flex items-center justify-center"
                  style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
                  <span style={{ color: 'var(--gold)', fontSize: 24 }}>✓</span>
                </div>
                <p className="font-mono text-[11px] text-center uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Password updated successfully
                </p>
              </div>
              <button onClick={() => router.push('/login')}
                className="w-full py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                Sign In <span style={{ color: 'var(--gold)' }}>→</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {!searchParams.get('email') && (
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com" required className={inputClass}
                    style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
                </div>
              )}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Reset Code</label>
                <input type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} required
                  className={`${inputClass} text-center tracking-[0.5em] font-mono`}
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters" required className={inputClass}
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required className={inputClass}
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
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
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Reset Password <span style={{ color: 'var(--gold)' }}>→</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
