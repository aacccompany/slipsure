'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Footer = () => {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
          <div className="space-y-3">
            <span className="font-mono text-sm font-bold text-zinc-900 block">FLOWSLIP</span>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              ระบบตรวจสอบสลิปโอนเงิน ผ่าน Bank Gateway โดยตรง
            </p>
            <p className="font-mono text-[11px] text-zinc-400">
              status: <span className="text-blue-700">● online</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-12 text-sm">
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-4">บริการ</p>
              <Link href="/verify" className="block text-zinc-500 hover:text-zinc-900 transition-colors">ตรวจสอบสลิป</Link>
              <Link href="/docs" className="block text-zinc-500 hover:text-zinc-900 transition-colors">API Docs</Link>
              <Link href="/services" className="block text-zinc-500 hover:text-zinc-900 transition-colors">Enterprise</Link>
            </div>
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-4">ข้อมูล</p>
              <Link href="/pricing" className="block text-zinc-500 hover:text-zinc-900 transition-colors">ราคา</Link>
              <Link href="/docs" className="block text-zinc-500 hover:text-zinc-900 transition-colors">Documentation</Link>
              <Link href="#" className="block text-zinc-500 hover:text-zinc-900 transition-colors">FAQ</Link>
            </div>
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-4">ติดต่อ</p>
              <p className="text-zinc-500 text-sm">hello@flowslip.ai</p>
              <p className="text-zinc-500 text-sm">+66 2 123 4567</p>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">
            © 2026 FLOWSLIP — ALL RIGHTS RESERVED
          </span>
          <div className="flex gap-6">
            <a href="#" className="font-mono text-[11px] text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors">Privacy</a>
            <a href="#" className="font-mono text-[11px] text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors">Terms</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
