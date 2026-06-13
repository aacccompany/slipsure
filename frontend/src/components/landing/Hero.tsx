'use client';

import React from 'react';
import Link from 'next/link';

export const Hero = () => {
  return (
    <section className="pt-28 pb-20 px-6 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl space-y-8">

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-800 inline-block" />
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
              SYSTEM ONLINE — BANK GATEWAY CONNECTED
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-900 leading-[1.05]">
            ให้เรื่องสลิป<br />
            <span className="text-blue-800">เป็นเรื่องง่าย</span>
          </h1>

          <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
            ยืนยันความถูกต้องของสลิปธนาคารทุกใบภายใน 1 วินาที
            ผ่าน Bank Gateway โดยตรง ไม่มีการ OCR ไม่มีการเดา
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="bg-blue-800 text-white px-7 py-3.5 text-sm font-semibold hover:bg-blue-900 transition-colors rounded-full"
            >
              เริ่มต้นใช้งานฟรี →
            </Link>
            <Link
              href="/docs"
              className="text-sm text-zinc-600 border border-zinc-200 px-7 py-3.5 hover:border-zinc-400 hover:text-zinc-900 transition-colors rounded-full"
            >
              ดู API Docs
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};
