'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden bg-white hero-gradient">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[120px] opacity-30" />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              เชื่อมต่อตรงกับ API ธนาคารกสิกรไทย (KBank)
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-zinc-900 leading-[1.05]">
            ตรวจสอบสลิปโอนเงิน <br/>
            <span className="text-emerald-600">แม่นยำ 100%</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-500 font-medium leading-relaxed max-w-2xl">
            ระบบตรวจสอบสลิปผ่าน Gateway ธนาคารโดยตรง ใช้งานง่าย รวดเร็ว 
            ช่วยป้องกันสลิปปลอมและสลิปใช้ซ้ำได้อย่างมีประสิทธิภาพ
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
            <Link 
              href="/verify" 
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-600/20 active:scale-95 group"
            >
              เริ่มตรวจสอบสลิป
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/docs" 
              className="flex items-center justify-center gap-2 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 px-10 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95"
            >
              ดูเอกสาร API
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 w-full">
            {[
              { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, label: "ตรวจสอบผ่าน KBank API" },
              { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, label: "ป้องกันสลิปปลอมได้จริง" },
              { icon: <Zap className="w-5 h-5 text-emerald-600" />, label: "ประมวลผลทันทีใน 1 วินาที" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-3 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-zinc-100 shadow-sm">
                {item.icon}
                <span className="text-sm font-bold text-zinc-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
