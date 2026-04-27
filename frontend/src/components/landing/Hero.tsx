'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-40 pb-24 px-6 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 bg-violet-50 border border-violet-100 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">
            Enterprise-Grade Verification
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-8 leading-[1.1] text-balance">
          ระบบตรวจสอบสลิปอัตโนมัติ <br/> 
          <span className="text-[#7C3AED]">แม่นยำ 100%</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl font-medium leading-relaxed mb-12 mx-auto text-balance">
          ยกระดับความน่าเชื่อถือให้ธุรกิจของคุณด้วย API ตรวจสอบสลิปที่รวดเร็วที่สุด 
          ป้องกันสลิปปลอมและสลิปตัดต่อด้วยเทคโนโลยี AI ล่าสุด
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/verify" className="bg-zinc-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/10">
            เริ่มใช้งานระบบ
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/services" className="bg-white border border-zinc-200 text-zinc-600 px-10 py-4 rounded-xl font-bold hover:border-zinc-900 hover:text-zinc-900 transition-all">
            รายละเอียดบริการ
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-12 border-t border-zinc-100 opacity-60">
           {['สแกน QR อัตโนมัติ', 'ตรวจจับสลิปตัดต่อ', 'เชื่อมต่อ Gateway ตรง', 'รองรับทุกธนาคาร'].map((text) => (
             <div key={text} className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {text}
             </div>
           ))}
        </div>
      </div>
    </section>
  );
};
