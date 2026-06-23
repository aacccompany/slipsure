'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Zap, Receipt, Shield, Loader2 } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') ?? '';
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (countdown <= 0) { router.push('/dashboard/subscription'); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const shortRef = sessionId ? sessionId.slice(-8).toUpperCase() : '—';

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      {/* Top bar */}
      <div className="relative" style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Payment Confirmed
            </span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'var(--border-strong)' }}>
            FLOWSLIP / CHECKOUT / SUCCESS
          </span>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Main card */}
        <div className="bg-white mb-8" style={{ border: '1px solid var(--border)' }}>
          {/* Gold top */}
          <div className="h-1" style={{ background: 'var(--gold)' }} />

          <div className="p-10">
            {/* Icon */}
            <div className="w-14 h-14 flex items-center justify-center mb-8"
              style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}>
              <span style={{ color: 'var(--gold)', fontSize: 24 }}>✓</span>
            </div>

            <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
              / Payment Successful
            </p>
            <h1 className="font-display text-4xl font-semibold mb-3" style={{ color: 'var(--navy)' }}>
              Payment Confirmed
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
              Your subscription has been activated. You can now use all features included in your plan.
            </p>

            {/* Details */}
            <div className="mb-10" style={{ border: '1px solid var(--border)' }}>
              {[
                { label: 'Status',    value: 'Active',                  isGold: true },
                { label: 'Reference', value: `#${shortRef}`,            isGold: false },
                { label: 'Redirect',  value: `Dashboard in ${countdown}s`, isGold: false },
              ].map(({ label, value, isGold }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: isGold ? 'var(--gold)' : 'var(--navy)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <Link href="/dashboard/subscription"
              className="flex items-center justify-center gap-2 w-full py-4 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
              <span style={{ color: 'var(--gold)' }}>→</span>
            </Link>
          </div>
        </div>

        {/* Next steps */}
        <p className="font-mono text-[11px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          / What&apos;s Next
        </p>
        <div className="space-y-3">
          {[
            { icon: Zap,     title: 'Your quota is ready',     desc: 'Start verifying slips immediately — your monthly quota is now active.' },
            { icon: Receipt, title: 'Integrate via API',       desc: 'Head to API Docs in your dashboard to start integrating.' },
            { icon: Shield,  title: 'Configure LINE webhook',  desc: 'Connect your LINE OA to receive and verify slips automatically.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4"
              style={{ background: '#fff', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{ background: 'var(--gold-pale)', border: '1px solid var(--border)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--navy)' }}>{title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
