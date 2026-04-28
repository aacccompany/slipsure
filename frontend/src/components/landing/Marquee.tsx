'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const Marquee = () => {
  const items = [
    "KASIKORNBANK", "SCB", "BANGKOK BANK", "KRUNGTHAI", "TTB", "GSB", "UOB"
  ];

  return (
    <div className="py-12 bg-[#fafafa] border-y border-zinc-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">รองรับการตรวจสอบจากธนาคารชั้นนำ</p>
      </div>
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-4 mx-12">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span className="text-xl font-black text-zinc-300 tracking-tighter uppercase grayscale hover:grayscale-0 transition-all cursor-default">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
