'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Footer = () => {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer style={{ background: 'var(--navy)', borderTop: '2px solid var(--blue)' }}>
      <div className="max-w-7xl mx-auto px-6 py-12">

        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">

          {/* Brand */}
          <div className="space-y-4">
            <span
              className="font-mono text-sm font-bold block tracking-widest"
              style={{ color: 'var(--cyan)' }}
            >
              FLOWSLIP.AI
            </span>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(248,250,252,0.5)' }}>
              ระบบตรวจสอบสลิปโอนเงิน ผ่าน Bank Gateway โดยตรง
              แม่นยำ รวดเร็ว ไม่มีการเดา
            </p>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#22C55E' }}
              />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(248,250,252,0.35)' }}>
                All systems online
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div className="space-y-3">
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'var(--cyan)', opacity: 0.7 }}
              >
                บริการ
              </p>
              {[
                { label: 'ตรวจสอบสลิป', href: '/services' },
                { label: 'Enterprise', href: '/services' },
              ].map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="block text-sm transition-colors"
                  style={{ color: 'rgba(248,250,252,0.45)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(248,250,252,0.45)')}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'var(--cyan)', opacity: 0.7 }}
              >
                ข้อมูล
              </p>
              {[
                { label: 'ราคา', href: '/pricing' },
                { label: 'FAQ', href: '#' },
              ].map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="block text-sm transition-colors"
                  style={{ color: 'rgba(248,250,252,0.45)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(248,250,252,0.45)')}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'var(--cyan)', opacity: 0.7 }}
              >
                ติดต่อ
              </p>
              <p className="text-sm" style={{ color: 'rgba(248,250,252,0.45)' }}>hello@flowslip.ai</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(0,82,255,0.2)' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(248,250,252,0.25)' }}>
            © 2026 FLOWSLIP — ALL RIGHTS RESERVED
          </span>
          <div className="flex gap-6">
            {['Privacy', 'Terms'].map((item) => (
              <a
                key={item}
                href="#"
                className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'rgba(248,250,252,0.25)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(248,250,252,0.25)')}
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
