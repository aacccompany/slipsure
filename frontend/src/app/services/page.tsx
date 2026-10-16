'use client';

import React from 'react';
import { ArrowUpRight, Globe, MessageSquare, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type Service = {
  icon: LucideIcon;
  number: string;
  tag: string;
  title: string;
  desc: string;
  bg: string;
  ink: string;
  mute: string;
  bubble: string;
  bubbleInk: string;
  tagInk: string;
  /** tilt on desktop so the trio feels like stacked stickers */
  tilt: string;
};

const services: Service[] = [
  {
    icon: Store,
    number: '01',
    tag: 'E-commerce',
    title: 'ร้านค้าออนไลน์',
    desc: 'ตรวจสอบสลิปอัตโนมัติทุกครั้งที่ลูกค้าชำระเงิน ลดภาระตรวจสอบด้วยมือและป้องกันสลิปปลอมได้ 100%',
    bg: '#fff',
    ink: 'var(--navy)',
    mute: 'var(--text-muted)',
    bubble: 'var(--blue-pale)',
    bubbleInk: 'var(--blue)',
    tagInk: 'var(--blue)',
    tilt: 'md:-rotate-2',
  },
  {
    icon: MessageSquare,
    number: '02',
    tag: 'LINE OA',
    title: 'เชื่อมต่อ LINE OA',
    desc: 'ลูกค้าส่งสลิปผ่าน LINE แล้วได้ผลยืนยันอัตโนมัติทันที ไม่ต้องเปิดแอปเพิ่ม ตั้งค่าภายใน 5 นาที',
    bg: 'var(--navy)',
    ink: '#fff',
    mute: 'rgba(255,255,255,0.68)',
    bubble: 'var(--cyan)',
    bubbleInk: 'var(--navy)',
    tagInk: 'var(--cyan)',
    tilt: 'md:translate-y-6 md:rotate-1',
  },
  {
    icon: Globe,
    number: '03',
    tag: 'REST API',
    title: 'เชื่อมต่อผ่าน API',
    desc: 'มี REST API พร้อมใช้งาน เชื่อมต่อเข้ากับระบบ POS ระบบหลังร้าน หรือแอปของคุณได้เลยทันที',
    bg: 'var(--blue)',
    ink: '#fff',
    mute: 'rgba(255,255,255,0.78)',
    bubble: '#fff',
    bubbleInk: 'var(--blue)',
    tagInk: 'var(--cyan)',
    tilt: 'md:-rotate-1',
  },
];

const stats = [
  { label: 'ธนาคารที่รองรับ', value: '8+' },
  { label: 'เวลาตรวจสอบ', value: '<1 วิ' },
  { label: 'ตรวจสลิปซ้ำ', value: '24 ชม.' },
  { label: 'ยืนยันผ่าน Bank API', value: '100%' },
];

export default function ServicesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-6 pt-32 md:px-8" style={{ background: 'var(--bg)' }}>
      {/* background bubbles */}
      <div aria-hidden className="pointer-events-none absolute -right-32 top-10 h-[26rem] w-[26rem] rounded-full" style={{ background: 'var(--cyan-pale)' }} />
      <div aria-hidden className="pointer-events-none absolute -left-40 top-[28rem] h-[24rem] w-[24rem] rounded-full" style={{ background: 'var(--blue-pale)', opacity: 0.7 }} />

      <div className="relative mx-auto max-w-5xl">
        {/* หัวข้อ */}
        <div className="pop-in mx-auto mb-16 max-w-3xl text-center md:mb-24">
          <span
            className="mb-6 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold"
            style={{ color: 'var(--blue)', boxShadow: '0 0 0 1px rgba(0,24,71,0.08)' }}
          >
            บริการของเรา
          </span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.2] md:text-7xl" style={{ color: 'var(--navy)' }}>
            ใช้งานได้กับ
            <br />
            <span className="relative inline-block" style={{ color: 'var(--blue)' }}>
              ทุกประเภทธุรกิจ
              <svg aria-hidden viewBox="0 0 400 24" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3.5 w-full md:h-5">
                <path d="M4 16 C 60 4, 110 22, 170 12 S 290 4, 396 14" fill="none" stroke="var(--cyan)" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-muted)' }}>
            ไม่ว่าจะเป็นร้านค้าออนไลน์ ร้านค้าทั่วไป หรือแอปพลิเคชัน FlowSlip พร้อมให้บริการตรวจสอบสลิปในรูปแบบที่เหมาะกับคุณ
          </p>
        </div>

        {/* การ์ดบริการ */}
        <div className="mb-24 grid gap-6 md:mb-32 md:grid-cols-3 md:gap-7">
          {services.map((s, i) => (
            <div
              key={s.number}
              className={`pop-in group relative flex flex-col overflow-hidden rounded-[2.5rem] p-8 transition-transform duration-300 hover:!rotate-0 hover:-translate-y-2 md:p-10 ${s.tilt}`}
              style={{
                background: s.bg,
                animationDelay: `${0.1 + i * 0.1}s`,
                boxShadow: s.bg === '#fff'
                  ? '0 24px 40px -28px rgba(0,24,71,0.3), 0 0 0 1px rgba(0,24,71,0.07)'
                  : '0 24px 40px -24px rgba(0,24,71,0.45)',
              }}
            >
              <span
                aria-hidden
                className="font-display pointer-events-none absolute -right-3 -top-8 select-none text-[9rem] font-extrabold leading-none"
                style={{ color: s.ink, opacity: 0.07 }}
              >
                {s.number}
              </span>

              <span
                className="relative mb-12 flex h-16 w-16 items-center justify-center rounded-[1.4rem] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
                style={{ background: s.bubble, color: s.bubbleInk }}
              >
                <s.icon className="h-8 w-8" />
              </span>

              <p className="relative mb-2 text-sm font-bold" style={{ color: s.tagInk }}>
                {s.tag}
              </p>
              <h3 className="relative mb-4 text-2xl font-extrabold leading-snug md:text-[1.7rem]" style={{ color: s.ink }}>
                {s.title}
              </h3>
              <p className="relative text-base leading-relaxed" style={{ color: s.mute }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div data-reveal className="relative overflow-hidden rounded-[2.5rem] p-8 md:rounded-[3.5rem] md:p-16" style={{ background: 'var(--navy)' }}>
          <div aria-hidden className="absolute -right-20 -top-24 h-80 w-80 rounded-full" style={{ background: 'var(--blue)', opacity: 0.55 }} />
          <div aria-hidden className="absolute -bottom-24 left-10 h-56 w-56 rounded-full" style={{ background: 'var(--cyan)', opacity: 0.13 }} />

          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span
                className="mb-6 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--cyan)' }}
              >
                เริ่มต้นได้เลย
              </span>
              <h2 className="font-display mb-5 text-4xl font-extrabold leading-[1.2] text-white md:text-6xl">
                พร้อมปกป้อง
                <br />
                <span style={{ color: 'var(--cyan)' }}>ธุรกิจของคุณ?</span>
              </h2>
              <p className="mb-8 max-w-md text-base leading-relaxed md:text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
                สมัครฟรีวันนี้ รับโควต้า 20 สลิปต่อเดือน ไม่ต้องใช้บัตรเครดิต ยกเลิกได้ทุกเมื่อ
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-3 rounded-full py-2 pl-7 pr-2 text-base font-bold transition-transform hover:scale-[1.03]"
                  style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
                >
                  สมัครใช้งานฟรี
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:rotate-45"
                    style={{ background: 'var(--navy)', color: 'var(--cyan)' }}
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-full px-7 py-4 text-base font-bold text-white transition-colors hover:bg-white/10"
                  style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.3)' }}
                >
                  ดูแผนราคา
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] p-6"
                  style={{ background: i === 0 ? 'var(--blue)' : 'rgba(255,255,255,0.07)' }}
                >
                  <p className="mb-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {stat.label}
                  </p>
                  <p className="font-display text-3xl font-extrabold md:text-4xl" style={{ color: i === 0 ? '#fff' : 'var(--cyan)' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
