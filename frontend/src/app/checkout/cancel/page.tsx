'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, ArrowRight, MessageSquare } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      {/* Top bar */}
      <div className="relative" style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/subscription"
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Plans
            </Link>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-rose-500">
                Payment Cancelled
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'var(--border-strong)' }}>
            FLOWSLIP / CHECKOUT / CANCEL
          </span>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Main card */}
        <div className="bg-white mb-8" style={{ border: '1px solid #FECACA' }}>
          {/* Red top */}
          <div className="h-1 bg-rose-400" />

          <div className="p-10">
            {/* Icon */}
            <div className="w-14 h-14 flex items-center justify-center mb-8"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <span className="text-rose-500" style={{ fontSize: 24 }}>✕</span>
            </div>

            <p className="font-mono text-[11px] uppercase tracking-widest mb-3 text-rose-400">
              / Payment Not Completed
            </p>
            <h1 className="font-display text-4xl font-semibold mb-3" style={{ color: 'var(--navy)' }}>
              Payment Cancelled
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
              Your payment was not completed. No charge has been made to your account.
              You can return to the plans page and try again anytime.
            </p>

            {/* Status rows */}
            <div className="mb-10" style={{ border: '1px solid var(--border)' }}>
              {[
                { label: 'Charge',  value: 'None — your card was not charged' },
                { label: 'Account', value: 'Unchanged — still on Free plan' },
                { label: 'Session', value: 'Expired' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/dashboard/subscription"
                className="flex items-center justify-center gap-2 w-full py-4 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
                <RotateCcw className="w-4 h-4" />
                Try Again
                <span style={{ color: 'var(--gold)' }}>→</span>
              </Link>
              <Link href="/dashboard"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium border transition-all hover:opacity-75"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="p-5 flex items-start gap-4" style={{ background: '#fff', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 flex items-center justify-center shrink-0"
            style={{ background: 'var(--gold-pale)', border: '1px solid var(--border)' }}>
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>Need help?</p>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
              If you experienced issues during checkout or were charged unexpectedly, our support team is ready to help.
            </p>
            <a href="mailto:support@flowslip.ai"
              className="font-mono text-[11px] uppercase tracking-widest hover:underline transition-colors"
              style={{ color: 'var(--gold)' }}>
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
