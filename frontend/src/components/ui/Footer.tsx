'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Globe, Send, MessageSquare } from 'lucide-react';

export const Footer = () => {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <footer className="bg-white border-t border-zinc-100 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900">
                Slipsure<span className="text-emerald-600">.ai</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              ระบบตรวจสอบสลิปโอนเงินอัจฉริยะ แม่นยำ รวดเร็ว และปลอดภัยที่สุดสำหรับธุรกิจของคุณ
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-emerald-600 transition-colors">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-emerald-600 transition-colors">
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-zinc-900 mb-6 text-sm uppercase tracking-widest">บริการของเรา</h4>
            <ul className="space-y-4 text-sm font-medium text-zinc-500">
              <li><Link href="/verify" className="hover:text-emerald-600 transition-colors">ตรวจสอบสลิป</Link></li>
              <li><Link href="/docs" className="hover:text-emerald-600 transition-colors">API สำหรับนักพัฒนา</Link></li>
              <li><Link href="/services" className="hover:text-emerald-600 transition-colors">โซลูชันสำหรับองค์กร</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-900 mb-6 text-sm uppercase tracking-widest">แหล่งความรู้</h4>
            <ul className="space-y-4 text-sm font-medium text-zinc-500">
              <li><Link href="/docs" className="hover:text-emerald-600 transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-emerald-600 transition-colors">คู่มือการใช้งาน</Link></li>
              <li><Link href="#" className="hover:text-emerald-600 transition-colors">คำถามที่พบบ่อย</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-900 mb-6 text-sm uppercase tracking-widest">ติดต่อเรา</h4>
            <ul className="space-y-4 text-sm font-medium text-zinc-500">
              <li>hello@slipsure.ai</li>
              <li>ชั้น 24 อาคารสาทรธานี กรุงเทพฯ</li>
              <li>+66 2 123 4567</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-zinc-50 flex flex-col md:row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            © 2026 Slipsure.Ai - All rights reserved.
          </p>
          <div className="flex gap-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <a href="#" className="hover:text-zinc-900">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-900">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
