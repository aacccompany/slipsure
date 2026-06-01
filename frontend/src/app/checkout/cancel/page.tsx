'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft, ArrowRight, RotateCcw, MessageSquare } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header bar */}
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/subscription"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Plans
            </Link>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="font-mono text-[11px] text-red-500 uppercase tracking-widest">PAYMENT CANCELLED</span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">FLOWSLIP / CHECKOUT / CANCEL</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Main card */}
        <div className="border border-red-200 p-12 mb-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 border border-red-200 bg-red-50 mb-8">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>

          <p className="font-mono text-[11px] text-red-400 uppercase tracking-widest mb-3">/ PAYMENT NOT COMPLETED</p>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">Payment Cancelled</h1>
          <p className="text-sm text-zinc-500 mb-10">
            Your payment was not completed. No charge has been made to your account. You can return to
            the plans page and try again anytime.
          </p>

          {/* Status rows */}
          <div className="border border-zinc-100 divide-y divide-zinc-100 mb-10">
            {[
              { label: 'Charge',  value: 'None — your card was not charged' },
              { label: 'Account', value: 'Unchanged — still on Free plan' },
              { label: 'Session', value: 'Expired' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">{label}</span>
                <span className="text-sm font-medium text-zinc-700">{value}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/subscription"
              className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white text-sm font-bold hover:bg-black transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 border border-zinc-200 text-zinc-600 text-sm font-medium hover:border-zinc-300 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="border border-zinc-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 border border-zinc-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 mb-1">Need help?</p>
              <p className="text-xs text-zinc-500 mb-3">
                If you experienced issues during checkout or were charged unexpectedly, our support team
                is ready to help.
              </p>
              <a
                href="mailto:support@flowslip.ai"
                className="font-mono text-[11px] text-blue-800 uppercase tracking-widest hover:underline"
              >
                CONTACT SUPPORT →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
