'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, Globe } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#fcfcfc] py-20 px-6 border-t border-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-6">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-6 h-6 text-[#7C3AED]" />
              <span className="text-xl font-bold tracking-tight text-zinc-900 uppercase">SLIPSURE</span>
            </Link>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs">
              ยกระดับมาตรฐานความปลอดภัยในการรับชำระเงิน ด้วยระบบตรวจสอบสลิปอัตโนมัติที่แม่นยำและรวดเร็วที่สุด
            </p>
          </div>
          <div className="md:col-span-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-6">Platform</p>
            <ul className="space-y-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <li><Link href="/services" className="hover:text-zinc-900 transition-colors">Services</Link></li>
              <li><Link href="/pricing" className="hover:text-zinc-900 transition-colors">Pricing</Link></li>
              <li><Link href="/verify" className="hover:text-zinc-900 transition-colors">Verification</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-6">Connect</p>
            <ul className="space-y-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <li className="flex items-center gap-2 transition-colors hover:text-zinc-900"><Mail className="w-3.5 h-3.5" /> contact@slipsure.com</li>
              <li className="flex items-center gap-2 transition-colors hover:text-zinc-900"><Globe className="w-3.5 h-3.5" /> slipsure.com</li>
            </ul>
          </div>
        </div>
        <div className="pt-12 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
          <p>© 2026 SLIPSURE.AI ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-zinc-900 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
