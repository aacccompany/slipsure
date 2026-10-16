'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const columns = [
  {
    title: 'บริการ',
    links: [
      { label: 'ตรวจสอบสลิป', href: '/services' },
      { label: 'Enterprise', href: '/services' },
    ],
  },
  {
    title: 'ข้อมูล',
    links: [
      { label: 'ราคา', href: '/pricing' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
];

export const Footer = () => {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="px-3 pb-3 pt-6 md:px-5 md:pb-5" style={{ background: 'var(--bg)' }}>
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-7 py-12 md:rounded-[3rem] md:px-14"
        style={{ background: 'var(--navy)' }}
      >
        {/* decorative bubbles */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-30"
          style={{ background: 'var(--blue)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 left-1/3 h-28 w-28 rounded-full opacity-90"
          style={{ background: 'var(--cyan)', opacity: 0.12 }}
        />

        <div className="relative mb-12 flex flex-col justify-between gap-12 md:flex-row">
          {/* Brand */}
          <div className="max-w-sm space-y-4">
            <span
              className="block text-2xl font-extrabold tracking-tight"
              style={{ color: '#fff', fontFamily: 'var(--font-display)' }}
            >
              flow<span style={{ color: 'var(--cyan)' }}>slip</span>.ai
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ระบบตรวจสอบสลิปโอนเงิน ผ่าน Bank Gateway โดยตรง แม่นยำ รวดเร็ว ไม่มีการเดา
            </p>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--cyan)' }} />
              All systems online
            </span>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm sm:grid-cols-3 sm:gap-14">
            {columns.map((col) => (
              <div key={col.title} className="space-y-3">
                <p className="mb-4 text-xs font-bold" style={{ color: 'var(--cyan)' }}>
                  {col.title}
                </p>
                {col.links.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    className="block text-sm font-medium transition-colors hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="space-y-3">
              <p className="mb-4 text-xs font-bold" style={{ color: 'var(--cyan)' }}>
                ติดต่อ
              </p>
              <a
                href="mailto:hello@flowslip.ai"
                className="block break-all text-sm font-medium transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                hello@flowslip.ai
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="relative flex flex-col items-center justify-between gap-4 pt-6 md:flex-row"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © 2026 FLOWSLIP — ALL RIGHTS RESERVED
          </span>
          <div className="flex gap-2">
            {['Privacy', 'Terms'].map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
