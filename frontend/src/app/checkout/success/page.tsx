'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, LayoutDashboard, Receipt, Zap, Shield } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') ?? '';
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/dashboard/subscription');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const shortRef = sessionId ? sessionId.slice(-8).toUpperCase() : '—';

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header bar */}
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">PAYMENT CONFIRMED</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">FLOWSLIP / CHECKOUT / SUCCESS</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Main card */}
        <div className="border border-zinc-200 p-12 mb-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 border border-emerald-200 bg-emerald-50 mb-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <p className="font-mono text-[11px] text-emerald-600 uppercase tracking-widest mb-3">/ PAYMENT SUCCESSFUL</p>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">Payment Confirmed</h1>
          <p className="text-sm text-zinc-500 mb-10">
            Your subscription has been activated. You can now use all features included in your plan.
          </p>

          {/* Details */}
          <div className="border border-zinc-100 divide-y divide-zinc-100 mb-10">
            {[
              { label: 'Status',    value: 'Active',             highlight: true },
              { label: 'Reference', value: `#${shortRef}`,       highlight: false },
              { label: 'Redirect',  value: `Dashboard in ${countdown}s`, highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">{label}</span>
                <span className={`text-sm font-bold ${highlight ? 'text-emerald-600' : 'text-zinc-900'}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/dashboard/subscription"
            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-white text-sm font-bold hover:bg-black transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Next steps */}
        <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4">/ WHAT&apos;S NEXT</p>
        <div className="space-y-3">
          {[
            {
              icon: Zap,
              title: 'Your quota is ready',
              desc: 'Start verifying slips immediately — your monthly quota is now active.',
            },
            {
              icon: Receipt,
              title: 'Generate an API key',
              desc: 'Head to Keys → create a key to integrate with your system.',
            },
            {
              icon: Shield,
              title: 'Configure webhooks',
              desc: 'Set up webhook endpoints to receive real-time verification results.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 border border-zinc-100 p-4">
              <div className="w-8 h-8 border border-zinc-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 mb-0.5">{title}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pt-20 flex items-center justify-center">
          <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">LOADING...</span>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
