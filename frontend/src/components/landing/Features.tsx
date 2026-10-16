'use client';

import React from 'react';
import { Copy, Landmark, QrCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Feature = {
  tag: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** card surface / ink / icon bubble */
  tone: { bg: string; ink: string; sub: string; bubble: string; bubbleInk: string; tag: string };
  span: string;
};

const features: Feature[] = [
  {
    tag: 'QR Extraction',
    title: 'ดึงข้อมูล QR โดยตรง',
    desc: 'ระบบอ่านค่า EMVCo จาก QR Code ในสลิปโดยตรง ไม่ใช้ OCR ไม่มีการเดา อ่านได้แม้ภาพไม่คมชัด',
    icon: QrCode,
    tone: { bg: '#fff', ink: 'var(--navy)', sub: 'var(--text-muted)', bubble: 'var(--blue-pale)', bubbleInk: 'var(--blue)', tag: 'var(--blue)' },
    span: 'md:col-span-3',
  },
  {
    tag: 'Bank Verify',
    title: 'ยืนยันผ่านธนาคารจริง',
    desc: 'ส่งข้อมูลตรวจสอบผ่าน Bank Gateway ของจริงทุกครั้ง ผลลัพธ์มาจากธนาคาร ไม่ใช่การวิเคราะห์ภาพ',
    icon: Landmark,
    tone: { bg: 'var(--navy)', ink: '#fff', sub: 'rgba(255,255,255,0.65)', bubble: 'var(--cyan)', bubbleInk: 'var(--navy)', tag: 'var(--cyan)' },
    span: 'md:col-span-3',
  },
  {
    tag: 'Duplicate Detection',
    title: 'ตรวจจับสลิปซ้ำ',
    desc: 'ตรวจสอบรายการซ้ำย้อนหลัง 24 ชั่วโมงอัตโนมัติ ป้องกันการนำสลิปเก่ามาใช้ซ้ำได้ทันที',
    icon: Copy,
    tone: { bg: 'var(--blue)', ink: '#fff', sub: 'rgba(255,255,255,0.75)', bubble: '#fff', bubbleInk: 'var(--blue)', tag: 'var(--cyan)' },
    span: 'md:col-span-6',
  },
];

export const Features = () => {
  return (
    <section className="px-4 py-16 md:px-8 md:py-24" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
          <div>
            <span
              className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
            >
              ระบบทำงานอย่างไร
            </span>
            <h2
              className="font-display text-4xl font-extrabold leading-[1.2] md:text-6xl"
              style={{ color: 'var(--navy)' }}
            >
              3 อย่างที่ทำให้
              <br />
              <span style={{ color: 'var(--blue)' }}>สลิปปลอมไม่รอด</span>
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-6 md:gap-5">
          {features.map((f, i) => (
            <div
              key={f.tag}
              className={`group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[2.25rem] p-8 transition-transform duration-300 hover:-translate-y-1 md:p-10 ${f.span}`}
              style={{
                background: f.tone.bg,
                boxShadow: f.tone.bg === '#fff' ? '0 0 0 1px rgba(0,24,71,0.07)' : undefined,
              }}
            >
              {/* oversized ghost number */}
              <span
                aria-hidden
                className="font-display pointer-events-none absolute -right-2 -top-6 select-none text-[9rem] font-extrabold leading-none"
                style={{ color: f.tone.ink, opacity: 0.06 }}
              >
                0{i + 1}
              </span>

              <span
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                style={{ background: f.tone.bubble, color: f.tone.bubbleInk }}
              >
                <f.icon className="h-7 w-7" />
              </span>

              <div className="relative mt-10 max-w-xl">
                <p className="mb-2 text-sm font-bold" style={{ color: f.tone.tag }}>
                  {f.tag}
                </p>
                <h3 className="mb-3 text-2xl font-extrabold md:text-3xl" style={{ color: f.tone.ink }}>
                  {f.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: f.tone.sub }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
