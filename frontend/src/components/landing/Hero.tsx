'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, MessageCircle, ShieldCheck, Zap } from 'lucide-react';

/** Slip being scanned: a beam sweeps it, then a "real" or "fake" stamp lands (10s loop, CSS only). */
function ScannerSlip() {
  const rows = [
    ['เลขอ้างอิง', 'REF202506231042198'],
    ['เวลา', '10:42:33 น.'],
    ['ธนาคาร', 'กสิกรไทย → SCB'],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[22rem]" style={{ ['--r' as string]: '3deg' }}>
      {/* soft bubbles behind the slip */}
      <div
        aria-hidden
        className="absolute -right-10 -top-10 h-44 w-44 rounded-full"
        style={{ background: 'var(--cyan)', opacity: 0.35 }}
      />
      <div
        aria-hidden
        className="absolute -bottom-8 -left-10 h-36 w-36 rounded-full"
        style={{ background: 'var(--blue)', opacity: 0.16 }}
      />

      <div className="bob relative">
        <div
          className="relative overflow-hidden rounded-[2rem] bg-white"
          style={{ boxShadow: '0 30px 60px -24px rgba(0,24,71,0.35), 0 0 0 1px rgba(0,24,71,0.06)' }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--navy)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--cyan)' }}>
              FLOWSLIP · VERIFY
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              23.06.68
            </span>
          </div>

          <div className="relative px-6 pb-[4.75rem] pt-6">
            {/* status pill (swaps with the stamp) */}
            <div className="relative mb-4 h-8">
              <span
                className="slip-status-real absolute left-0 top-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold"
                style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> ยืนยันแล้ว
              </span>
              <span
                className="slip-status-fake absolute left-0 top-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold opacity-0"
                style={{ background: 'var(--fake-pale)', color: 'var(--fake)' }}
              >
                ✕ ไม่พบในระบบธนาคาร
              </span>
            </div>

            <p className="font-display text-[clamp(1.9rem,9vw,2.6rem)] font-extrabold leading-none whitespace-nowrap" style={{ color: 'var(--navy)' }}>
              ฿ 2,500.00
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              โอนเงินสำเร็จ
            </p>

            <div className="mt-6 space-y-3 border-t border-dashed pt-5" style={{ borderColor: 'var(--border-strong)' }}>
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 text-xs">
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="font-mono font-medium" style={{ color: 'var(--navy)' }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* scan beam */}
            <div
              aria-hidden
              className="slip-beam pointer-events-none absolute inset-x-0 h-14 -translate-y-1/2 opacity-0"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.45) 50%, transparent)',
                borderBottom: '2px solid var(--cyan)',
              }}
            />

            {/* stamps */}
            <div
              aria-hidden
              className="slip-stamp-real pointer-events-none absolute bottom-4 right-5 rounded-2xl border-[3px] px-4 py-2 text-base font-extrabold opacity-0"
              style={{ borderColor: 'var(--blue)', color: 'var(--blue)', background: 'rgba(255,255,255,0.7)' }}
            >
              สลิปจริง ✓
            </div>
            <div
              aria-hidden
              className="slip-stamp-fake pointer-events-none absolute bottom-4 right-5 rounded-2xl border-[3px] px-4 py-2 text-base font-extrabold opacity-0"
              style={{ borderColor: 'var(--fake)', color: 'var(--fake)', background: 'rgba(255,255,255,0.7)' }}
            >
              สลิปปลอม ✕
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div
        className="bob-slow absolute -top-7 -left-3 hidden items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 text-xs font-bold sm:flex md:-left-8"
        style={{
          color: 'var(--navy)',
          ['--r' as string]: '-4deg',
          boxShadow: '0 14px 30px -14px rgba(0,24,71,0.35), 0 0 0 1px rgba(0,24,71,0.06)',
        }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#06C755', color: '#fff' }}>
          <MessageCircle className="h-4 w-4" />
        </span>
        ลูกค้าส่งสลิปใน LINE
      </div>
      <div
        className="bob absolute -bottom-7 left-6 hidden items-center gap-2 rounded-full py-2 pl-2 pr-4 text-xs font-bold sm:flex"
        style={{
          background: 'var(--navy)',
          color: '#fff',
          ['--r' as string]: '4deg',
          boxShadow: '0 14px 30px -14px rgba(0,24,71,0.5)',
        }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--cyan)', color: 'var(--navy)' }}>
          <Zap className="h-4 w-4" />
        </span>
        ตรวจใน &lt; 1 วินาที
      </div>
    </div>
  );
}

export const Hero = () => {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36" style={{ background: 'var(--bg)' }}>
      {/* background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 h-[28rem] w-[28rem] rounded-full"
        style={{ background: 'var(--blue-pale)', opacity: 0.7 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full"
        style={{ background: 'var(--cyan-pale)' }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
        {/* Left */}
        <div>
          <span
            className="pop-in mb-7 inline-flex items-center gap-2.5 rounded-full bg-white py-2 pl-3 pr-5 text-sm font-semibold"
            style={{ color: 'var(--navy)', boxShadow: '0 0 0 1px rgba(0,24,71,0.08)' }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: 'var(--blue)' }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: 'var(--blue)' }} />
            </span>
            ตรวจกับธนาคารจริง ไม่ใช่ OCR
          </span>

          <h1 className="pop-in font-display font-extrabold" style={{ color: 'var(--navy)', animationDelay: '0.08s' }}>
            <span className="block text-[2.4rem] leading-[1.2] sm:text-6xl lg:text-[clamp(3.5rem,5.6vw,4.5rem)]">หยุด</span>
            <span className="relative mt-1 inline-block">
              <span
                className="block whitespace-nowrap text-[clamp(2.9rem,15vw,3.6rem)] leading-[1.15] sm:text-[6rem] lg:text-[clamp(5rem,8.6vw,7.5rem)]"
                style={{ color: 'var(--blue)' }}
              >
                สลิปปลอม
              </span>
              {/* hand-drawn underline */}
              <svg
                aria-hidden
                viewBox="0 0 400 24"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-4 w-full sm:h-5"
              >
                <path
                  d="M4 16 C 60 4, 110 22, 170 12 S 290 4, 396 14"
                  fill="none"
                  stroke="var(--cyan)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="mt-5 block text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
              ด้วยการยืนยันจากธนาคารจริง
            </span>
          </h1>

          <p
            className="pop-in mt-6 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-muted)', animationDelay: '0.16s' }}
          >
            ตรวจสอบสลิปผ่าน Bank Gateway โดยตรง ไม่ใช่การอ่านภาพ ไม่ใช่การเดา
            ผลลัพธ์ถูกต้องภายในไม่ถึง 1 วินาที
          </p>

          <div className="pop-in mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.24s' }}>
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 rounded-full py-2 pl-7 pr-2 text-base font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: 'var(--navy)', boxShadow: '0 16px 30px -14px rgba(0,24,71,0.6)' }}
            >
              เริ่มใช้งานฟรี
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:rotate-45"
                style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
              >
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full bg-white px-7 py-4 text-base font-bold transition-colors hover:bg-[var(--blue-pale)]"
              style={{ color: 'var(--navy)', boxShadow: '0 0 0 1.5px rgba(0,24,71,0.12)' }}
            >
              ดูแผนราคา
            </Link>
          </div>

          <div className="pop-in mt-8 flex flex-wrap gap-2" style={{ animationDelay: '0.32s' }}>
            {['ฟรี 20 สลิป/เดือน', 'ไม่ต้องใช้บัตรเครดิต', 'ยกเลิกได้ทุกเมื่อ'].map((t) => (
              <span
                key={t}
                className="rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.75)', color: 'var(--text-muted)', boxShadow: '0 0 0 1px rgba(0,24,71,0.06)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="pop-in px-2 py-6 sm:px-10" style={{ animationDelay: '0.2s' }}>
          <ScannerSlip />
        </div>
      </div>
    </section>
  );
};
