'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Mail, Globe } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white py-24 px-6 border-t border-zinc-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
          
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
              <span className="text-xl font-black tracking-tighter text-zinc-900 uppercase">SLIPSURE.Ai</span>
            </Link>
            <p className="text-zinc-400 text-base font-medium leading-relaxed max-w-sm mb-10 text-balance">
              ผู้นำด้านเทคโนโลยีการตรวจสอบสลิปโอนเงินอัตโนมัติ แม่นยำ รวดเร็ว และปลอดภัยตามมาตรฐานสากล
            </p>
            <div className="flex gap-8">
              <a href="mailto:contact@slipsure.com" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Support
              </a>
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Network_Status
              </a>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12 text-zinc-900">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-8">Resources</p>
              <ul className="space-y-4 font-bold text-xs uppercase tracking-widest">
                <li><Link href="#" className="hover:text-[#4F46E5]">Developer API</Link></li>
                <li><Link href="#" className="hover:text-[#4F46E5]">Integration</Link></li>
                <li><Link href="#" className="hover:text-[#4F46E5]">Webhooks</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-8">Legal</p>
              <ul className="space-y-4 font-bold text-xs uppercase tracking-widest">
                <li><Link href="#" className="hover:text-[#4F46E5]">Privacy</Link></li>
                <li><Link href="#" className="hover:text-[#4F46E5]">Terms</Link></li>
                <li><Link href="#" className="hover:text-[#4F46E5]">Compliance</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
          <p>© 2026 SLIPSURE.Ai</p>
          <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
             <span>System_Status: Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
