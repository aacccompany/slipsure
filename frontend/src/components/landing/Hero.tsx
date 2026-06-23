'use client';

import React from 'react';
import Link from 'next/link';

const SlipCard = () => (
  <div className="relative w-[300px] shrink-0">
    <div className="absolute -bottom-2 -right-2 w-full h-full"
      style={{ background: 'var(--blue-pale)', border: '1px solid var(--border)' }} />

    <div className="relative overflow-hidden"
      style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,24,71,0.13)' }}>

      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--navy)' }}>
        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--cyan)' }}>
          FLOWSLIP · VERIFY
        </span>
        <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>23.06.68</span>
      </div>

      <div className="p-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4"
          style={{ background: 'var(--blue-pale)', border: '1px solid var(--blue)' }}>
          <span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 700 }}>✓</span>
          <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--blue)' }}>
            ยืนยันแล้ว
          </span>
        </div>

        <div className="text-3xl font-bold mb-1" style={{ color: 'var(--navy)', fontFamily: 'Sarabun, sans-serif' }}>
          ฿ 2,500.00
        </div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
          กสิกรไทย → SCB
        </div>
      </div>

      <div style={{ borderTop: '1px dashed var(--border)' }} />

      <div className="px-5 py-3 space-y-1.5">
        {[['เลขอ้างอิง', 'REF202506231042198'], ['เวลา', '10:42:33 น.'], ['สถานะ', 'ไม่ซ้ำ ✓']].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span className="font-mono text-[9px]" style={{ color: 'var(--navy)' }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="px-5 pb-4 pt-2">
        <div className="h-0.5 w-full mb-1" style={{ background: 'var(--blue)' }} />
        <div className="flex justify-between">
          <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>Bank verified</span>
          <span className="font-mono text-[9px]" style={{ color: 'var(--blue)' }}>100%</span>
        </div>
      </div>
    </div>
  </div>
);

export const Hero = () => {
  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Full-width status bar — not a pill, a real bar */}
      <div style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(0,82,255,0.25)' }}>
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22c55e' }}>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: '#22c55e', opacity: 0.4 }} />
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(248,250,252,0.55)' }}>
              Bank Gateway เชื่อมต่อแล้ว
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">

        {/* Main hero grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-12 lg:gap-16 pt-16 pb-12 items-start">

          {/* Left — dramatic headline */}
          <div>
            <h1 className="mb-8 leading-none">
              {/* "หยุด" — ghost light weight, very large */}
              <span
                className="block font-light select-none"
                style={{
                  fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                  color: 'rgba(0,24,71,0.15)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                หยุด
              </span>

              {/* "สลิปปลอม" — THE focus, massive, shimmer */}
              <span
                className="block gold-shimmer"
                style={{
                  fontSize: 'clamp(3.5rem, 11vw, 8.5rem)',
                  fontWeight: 800,
                  lineHeight: 0.9,
                  letterSpacing: '-0.03em',
                }}
              >
                สลิปปลอม
              </span>

              {/* Subtitle line — normal size, creates contrast */}
              <span
                className="block font-semibold mt-5"
                style={{
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                  color: 'var(--navy)',
                  lineHeight: 1.35,
                  letterSpacing: '-0.01em',
                }}
              >
                ด้วยการยืนยันจากธนาคารจริง
              </span>
            </h1>

            <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: 'var(--text-muted)' }}>
              ตรวจสอบสลิปผ่าน Bank Gateway โดยตรง ไม่ใช่การอ่านภาพ ไม่ใช่การเดา
              ผลลัพธ์ถูกต้องภายในไม่ถึง 1 วินาที
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                เริ่มใช้งานฟรี
                <span style={{ color: 'var(--cyan)' }}>→</span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium border transition-all hover:opacity-70"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--navy)' }}
              >
                ดูแผนราคา
              </Link>
            </div>
          </div>

          {/* Right — slip card */}
          <div className="flex justify-end pt-4 lg:pt-8">
            <SlipCard />
          </div>
        </div>

        {/* Trust strip — tight to the bottom, not a separate section */}
        <div
          className="flex items-center gap-6 py-4 flex-wrap"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {['ฟรี 50 สลิป/เดือน', 'ไม่ต้องใช้บัตรเครดิต', 'ยกเลิกได้ทุกเมื่อ'].map((text, i) => (
            <React.Fragment key={text}>
              {i > 0 && <span style={{ color: 'var(--border)' }}>·</span>}
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {text}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
