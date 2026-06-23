'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { Marquee } from '@/components/landing/Marquee';
import { Features } from '@/components/landing/Features';
import { ChevronDown } from 'lucide-react';

const stats = [
  { value: '<1 วิ',  label: 'เวลาตรวจสอบ',     sub: 'ต่อสลิป' },
  { value: '8+',     label: 'ธนาคารที่รองรับ',   sub: 'ทุกธนาคารหลัก' },
  { value: '24 ชม.', label: 'ตรวจสลิปซ้ำ',       sub: 'ย้อนหลัง' },
  { value: '100%',   label: 'Bank API',           sub: 'ไม่ใช่การอ่านภาพ' },
];

const steps = [
  { num: '01', title: 'สมัครฟรี',               desc: 'สร้างบัญชีภายใน 1 นาที ไม่ต้องใช้บัตรเครดิต รับโควต้า 50 สลิปทันที' },
  { num: '02', title: 'ตั้งค่า LINE OA หรือ API', desc: 'เชื่อมต่อ LINE OA ผ่าน Dashboard หรือรับ Token เพื่อใช้งานผ่าน API' },
  { num: '03', title: 'รับสลิป ตรวจอัตโนมัติ',   desc: 'ลูกค้าส่งสลิปมา ระบบตรวจสอบและตอบกลับให้อัตโนมัติทันที' },
];

const faqs = [
  { q: 'รองรับธนาคารอะไรบ้าง?', a: 'รองรับทุกธนาคารที่ใช้ QR Code มาตรฐาน PromptPay (EMVCo) ได้แก่ กสิกรไทย, SCB, กรุงไทย, กรุงเทพ, TTB, ออมสิน, UOB, CIMB และธนาคารอื่นๆ ที่รองรับ PromptPay' },
  { q: 'ต้องเขียนโค้ดไหมถ้าอยากใช้ผ่าน LINE?', a: 'ไม่ต้องเลย ตั้งค่า LINE OA ผ่าน Dashboard ได้ทันที กรอก Channel ID, Channel Secret และ Access Token แล้วก็พร้อมใช้งาน' },
  { q: 'ถ้าโควต้าหมดกลางเดือนจะเกิดอะไร?', a: 'ระบบจะหยุดตรวจสอบสลิปชั่วคราวและแจ้งเตือนให้คุณทราบ สามารถอัพเกรดแผนได้ทันทีเพื่อรับโควต้าเพิ่ม หรือรอรีเซ็ตในต้นเดือนถัดไป' },
  { q: 'ข้อมูลสลิปปลอดภัยไหม?', a: 'ข้อมูลทุกรายการเข้ารหัสด้วย AES-256 เก็บบน Cloud ที่ได้มาตรฐาน ไม่แชร์ข้อมูลกับบุคคลภายนอก และลบสลิปอัตโนมัติหลัง 90 วัน' },
  { q: 'ถ้าระบบตรวจผิดพลาดทำอย่างไร?', a: 'สามารถกด "ตรวจสอบใหม่" ได้จาก Dashboard ทุกเมื่อ และติดต่อทีมซัพพอร์ตได้โดยตรงหากพบปัญหา' },
  { q: 'ยกเลิกแผนได้ไหม?', a: 'ยกเลิกได้ทุกเมื่อจาก Dashboard โดยไม่มีค่าปรับ แผนจะยังใช้งานได้จนสิ้นรอบบิลปัจจุบัน' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between py-5 text-left gap-6 group"
      >
        <span
          className="text-base font-semibold leading-snug transition-colors"
          style={{ color: open ? 'var(--blue)' : 'var(--navy)' }}
        >
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 mt-0.5 shrink-0 transition-all duration-200"
          style={{
            color: 'var(--blue)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            opacity: open ? 1 : 0.5,
          }}
        />
      </button>
      {open && (
        <p className="text-sm leading-relaxed pb-5 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Hero />
      <Marquee />

      {/* ── Stats — raw numbers, no cards ──────────────────── */}
      <section style={{ background: 'var(--navy)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="py-14 px-8 text-center group transition-colors hover:bg-[rgba(0,82,255,0.07)]"
                style={{ borderRight: i < 3 ? '1px solid rgba(0,82,255,0.12)' : 'none' }}
              >
                <div
                  className="font-bold mb-1 tracking-tight"
                  style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: 'var(--blue)', letterSpacing: '-0.03em', lineHeight: 1 }}
                >
                  {s.value}
                </div>
                <p className="text-sm font-medium mb-0.5" style={{ color: 'rgba(248,250,252,0.75)' }}>{s.label}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(248,250,252,0.28)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Features />

      {/* ── Why FlowSlip — giant ✗ / ✓ ─────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto">

          {/* Section label */}
          <div className="px-6 md:px-12 pt-14 pb-10 flex items-center gap-4">
            <span className="inline-block w-2 h-2 rotate-45" style={{ background: 'var(--blue)' }} />
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              ทำไมต้อง FlowSlip
            </span>
          </div>

          {/* Giant ✗ / ✓ comparison — the human touch */}
          <div className="grid md:grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>

            {/* ✗ side */}
            <div
              className="relative px-10 pt-10 pb-14 overflow-hidden"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              {/* Giant decorative ✗ */}
              <div
                className="absolute -top-4 -left-2 select-none pointer-events-none font-black leading-none"
                style={{ fontSize: '14rem', color: 'rgba(239,68,68,0.06)', letterSpacing: '-0.05em' }}
              >
                ✗
              </div>
              <div className="relative">
                <span className="font-mono text-[10px] uppercase tracking-widest text-red-400 block mb-4">
                  ไม่ปลอดภัย
                </span>
                <h3
                  className="font-bold mb-3"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: 'var(--navy)', lineHeight: 1.2 }}
                >
                  OCR / AI อ่านภาพสลิป
                </h3>
                <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  แอปสร้างสลิปปลอมมีให้ดาวน์โหลดฟรีบนมือถือ
                  AI วิเคราะห์ภาพถูกหลอกได้ง่าย ไม่ว่าระบบจะฉลาดแค่ไหน
                </p>
              </div>
            </div>

            {/* ✓ side */}
            <div
              className="relative px-10 pt-10 pb-14 overflow-hidden"
              style={{ background: 'var(--blue-pale)' }}
            >
              {/* Giant decorative ✓ */}
              <div
                className="absolute -top-4 -left-2 select-none pointer-events-none font-black leading-none"
                style={{ fontSize: '14rem', color: 'rgba(0,82,255,0.07)', letterSpacing: '-0.05em' }}
              >
                ✓
              </div>
              <div className="relative">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest block mb-4"
                  style={{ color: 'var(--blue)' }}
                >
                  ปลอดภัย 100%
                </span>
                <h3
                  className="font-bold mb-3"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: 'var(--navy)', lineHeight: 1.2 }}
                >
                  ยืนยันผ่าน Bank Gateway
                </h3>
                <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  ผลมาจากธนาคารโดยตรง ปลอมแปลงไม่ได้
                  ไม่ว่าสลิปจะถูกสร้างมาอย่างดีแค่ไหน ระบบธนาคารไม่มีรายการนั้น
                </p>
              </div>
            </div>
          </div>

          {/* Feature list — 4 items below comparison */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { num: '01', title: 'เชื่อมต่อ LINE OA', desc: 'ลูกค้าส่งสลิปผ่าน LINE รับผลยืนยันอัตโนมัติ' },
              { num: '02', title: 'ป้องกันสลิปซ้ำ', desc: 'ตรวจย้อนหลัง 24 ชั่วโมง ป้องกัน Double Spend' },
              { num: '03', title: 'ดูสถิติ Real-time', desc: 'ติดตามสลิปทุกใบและสถิติย้อนหลังใน Dashboard' },
              { num: '04', title: 'REST API', desc: 'เชื่อมต่อเข้ากับระบบหลังร้านของคุณได้โดยตรง' },
            ].map((item, i) => (
              <div
                key={item.num}
                className="p-8 transition-colors hover:bg-white"
                style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest block mb-3" style={{ color: 'var(--blue)' }}>
                  {item.num}
                </span>
                <p className="font-bold text-sm mb-1.5" style={{ color: 'var(--navy)' }}>{item.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── เริ่มใช้งาน 3 ขั้นตอน ──────────────────────────── */}
      <section className="py-20 px-6 md:px-12" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto">

          <div className="flex items-baseline justify-between mb-14 flex-wrap gap-4">
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              พร้อมใช้งานใน
              <span style={{ color: 'var(--blue)' }}> 3 ขั้นตอน</span>
            </h2>
            <Link
              href="/register"
              className="font-mono text-[11px] uppercase tracking-widest transition-colors shrink-0"
              style={{ color: 'var(--blue)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--blue)')}
            >
              สมัครฟรีเลย →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-0" style={{ border: '1px solid var(--border)' }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="p-8 md:p-10 transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}
              >
                <div
                  className="font-black mb-6 leading-none select-none"
                  style={{ fontSize: '4.5rem', color: 'var(--border)', letterSpacing: '-0.04em' }}
                >
                  {step.num}
                </div>
                <h3 className="font-bold text-xl mb-3" style={{ color: 'var(--navy)', lineHeight: 1.2 }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto">

          <div className="grid lg:grid-cols-[1fr_2fr] gap-16">

            {/* Left — sticky label */}
            <div className="lg:sticky lg:top-24 self-start">
              <h2
                className="font-bold tracking-tight mb-4"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
              >
                คำถาม<br />
                <span style={{ color: 'var(--blue)' }}>ที่พบบ่อย</span>
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
                ไม่เจอคำตอบที่ต้องการ?
              </p>
              <a
                href="mailto:hello@flowslip.ai"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest transition-colors"
                style={{ color: 'var(--navy)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--blue)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--navy)')}
              >
                ติดต่อเราโดยตรง →
              </a>
            </div>

            {/* Right — FAQ items, open layout */}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {faqs.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust strip — quiet ──────────────────────────────── */}
      <section style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {[
              ['🔒', 'ข้อมูลเข้ารหัส AES-256'],
              ['🗑️', 'ลบสลิปอัตโนมัติหลัง 90 วัน'],
              ['🏦', 'ยืนยันตรงจาก Bank API'],
              ['📵', 'ไม่แชร์ข้อมูลกับบุคคลภายนอก'],
            ].map(([icon, text]) => (
              <div key={String(text)} className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{text as string}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'var(--navy)' }}
      >
        <div className="thai-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.05 }} />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-24">
          <div className="grid md:grid-cols-[1fr_auto] gap-12 items-end">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-6" style={{ color: 'rgba(0,82,255,0.55)' }}>
                เริ่มต้นวันนี้
              </p>
              <h2
                className="font-bold tracking-tight mb-6"
                style={{
                  fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                  color: 'rgba(248,250,252,0.95)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                ปกป้องธุรกิจ<br />
                ของคุณจาก<br />
                <span style={{ color: 'var(--cyan)' }}>สลิปปลอม</span>
              </h2>
              <p className="text-base leading-relaxed max-w-md" style={{ color: 'rgba(248,250,252,0.45)' }}>
                เชื่อมต่อ LINE OA ภายใน 5 นาที ไม่ต้องเขียนโค้ด ไม่ต้องติดตั้งอะไรเพิ่ม
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'var(--blue)', color: '#fff' }}
              >
                สมัครใช้งานฟรี →
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-medium border transition-all hover:opacity-75"
                style={{ borderColor: 'rgba(0,82,255,0.3)', color: 'rgba(248,250,252,0.6)' }}
              >
                ดูแผนราคา
              </Link>
            </div>
          </div>

          <div
            className="mt-16 pt-8 flex flex-wrap gap-y-2 gap-x-8"
            style={{ borderTop: '1px solid rgba(0,82,255,0.15)' }}
          >
            {['ฟรี 50 สลิป/เดือน', 'ไม่ต้องใช้บัตรเครดิต', 'ยกเลิกได้ทุกเมื่อ', 'รองรับทุกธนาคารไทย'].map((t) => (
              <span key={t} className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(248,250,252,0.3)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
