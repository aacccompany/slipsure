'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Plus, X } from 'lucide-react';
import { Hero } from '@/components/landing/Hero';
import { Marquee } from '@/components/landing/Marquee';
import { Features } from '@/components/landing/Features';

const stats = [
  { value: '<1 วิ', label: 'เวลาตรวจสอบ', sub: 'ต่อสลิป', bg: 'var(--blue)', ink: '#fff', mute: 'rgba(255,255,255,0.7)', span: 'md:col-span-3' },
  { value: '8+', label: 'ธนาคารที่รองรับ', sub: 'ทุกธนาคารหลัก', bg: '#fff', ink: 'var(--navy)', mute: 'var(--text-muted)', span: 'md:col-span-3' },
  { value: '24 ชม.', label: 'ตรวจสลิปซ้ำ', sub: 'ย้อนหลัง', bg: 'var(--cyan)', ink: 'var(--navy)', mute: 'rgba(0,24,71,0.65)', span: 'md:col-span-2' },
  { value: '100%', label: 'Bank API', sub: 'ไม่ใช่การอ่านภาพ', bg: 'var(--navy)', ink: '#fff', mute: 'rgba(255,255,255,0.65)', span: 'md:col-span-4' },
];

const steps = [
  { num: '1', title: 'สมัครฟรี', desc: 'สร้างบัญชีภายใน 1 นาที ไม่ต้องใช้บัตรเครดิต รับโควต้า 20 สลิปทันที' },
  { num: '2', title: 'ตั้งค่า LINE OA หรือ API', desc: 'เชื่อมต่อ LINE OA ผ่าน Dashboard หรือรับ Token เพื่อใช้งานผ่าน API' },
  { num: '3', title: 'รับสลิป ตรวจอัตโนมัติ', desc: 'ลูกค้าส่งสลิปมา ระบบตรวจสอบและตอบกลับให้อัตโนมัติทันที' },
];

const faqs = [
  { q: 'รองรับธนาคารอะไรบ้าง?', a: 'รองรับทุกธนาคารที่ใช้ QR Code มาตรฐาน PromptPay (EMVCo) ได้แก่ กสิกรไทย, SCB, กรุงไทย, กรุงเทพ, TTB, ออมสิน, UOB, CIMB และธนาคารอื่นๆ ที่รองรับ PromptPay' },
  { q: 'ต้องเขียนโค้ดไหมถ้าอยากใช้ผ่าน LINE?', a: 'ไม่ต้องเลย ตั้งค่า LINE OA ผ่าน Dashboard ได้ทันที กรอก Channel ID, Channel Secret และ Access Token แล้วก็พร้อมใช้งาน' },
  { q: 'ถ้าโควต้าหมดกลางเดือนจะเกิดอะไร?', a: 'ระบบจะหยุดตรวจสอบสลิปชั่วคราวและแจ้งเตือนให้คุณทราบ สามารถอัพเกรดแผนได้ทันทีเพื่อรับโควต้าเพิ่ม หรือรอรีเซ็ตในต้นเดือนถัดไป' },
  { q: 'ข้อมูลสลิปปลอดภัยไหม?', a: 'ข้อมูลทุกรายการเข้ารหัสด้วย AES-256 เก็บบน Cloud ที่ได้มาตรฐาน ไม่แชร์ข้อมูลกับบุคคลภายนอก และลบสลิปอัตโนมัติหลัง 90 วัน' },
  { q: 'ถ้าระบบตรวจผิดพลาดทำอย่างไร?', a: 'สามารถกด "ตรวจสอบใหม่" ได้จาก Dashboard ทุกเมื่อ และติดต่อทีมซัพพอร์ตได้โดยตรงหากพบปัญหา' },
  { q: 'ยกเลิกแผนได้ไหม?', a: 'ยกเลิกได้ทุกเมื่อจาก Dashboard โดยไม่มีค่าปรับ แผนจะยังใช้งานได้จนสิ้นรอบบิลปัจจุบัน' },
];

const extras = [
  { title: 'เชื่อมต่อ LINE OA', desc: 'ลูกค้าส่งสลิปผ่าน LINE รับผลยืนยันอัตโนมัติ' },
  { title: 'ป้องกันสลิปซ้ำ', desc: 'ตรวจย้อนหลัง 24 ชั่วโมง ป้องกัน Double Spend' },
  { title: 'ดูสถิติ Real-time', desc: 'ติดตามสลิปทุกใบและสถิติย้อนหลังใน Dashboard' },
  { title: 'REST API', desc: 'เชื่อมต่อเข้ากับระบบหลังร้านของคุณได้โดยตรง' },
];

const trust = ['ข้อมูลเข้ารหัส AES-256', 'ลบสลิปอัตโนมัติหลัง 90 วัน', 'ยืนยันตรงจาก Bank API', 'ไม่แชร์ข้อมูลกับบุคคลภายนอก'];

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
      style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
    >
      {children}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-[1.75rem] transition-colors"
      style={{
        background: open ? 'var(--navy)' : '#fff',
        boxShadow: open ? 'none' : '0 0 0 1px rgba(0,24,71,0.07)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left md:px-8"
      >
        <span className="text-base font-bold leading-snug md:text-lg" style={{ color: open ? '#fff' : 'var(--navy)' }}>
          {q}
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300"
          style={{
            background: open ? 'var(--cyan)' : 'var(--blue-pale)',
            color: open ? 'var(--navy)' : 'var(--blue)',
            transform: open ? 'rotate(135deg)' : 'rotate(0)',
          }}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <p className="pop-in max-w-2xl px-6 pb-6 text-sm leading-relaxed md:px-8 md:text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
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

      {/* ── Stats bento ─────────────────────────────────────── */}
      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-6 md:gap-5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              data-reveal={i}
              className={`group relative overflow-hidden rounded-[2.25rem] p-8 transition-transform duration-300 hover:-translate-y-1 md:p-10 ${s.span}`}
              style={{ background: s.bg, boxShadow: s.bg === '#fff' ? '0 0 0 1px rgba(0,24,71,0.07)' : undefined }}
            >
              <div
                aria-hidden
                className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full transition-transform duration-500 group-hover:scale-125"
                style={{ background: s.ink, opacity: 0.07 }}
              />
              <div
                className="font-display relative text-[3.2rem] font-extrabold leading-none md:text-[4.5rem]"
                style={{ color: s.ink, letterSpacing: '-0.02em' }}
              >
                {s.value}
              </div>
              <p className="relative mt-4 text-lg font-bold" style={{ color: s.ink }}>
                {s.label}
              </p>
              <p className="relative text-sm" style={{ color: s.mute }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Features />

      {/* ── Why FlowSlip — fake vs real ─────────────────────── */}
      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-5xl">
          <div data-reveal className="mb-10 text-center md:mb-14">
            <SectionTag>ทำไมต้อง FlowSlip</SectionTag>
            <h2 className="font-display text-4xl font-extrabold leading-[1.2] md:text-6xl" style={{ color: 'var(--navy)' }}>
              ภาพหลอกตาได้
              <br />
              <span style={{ color: 'var(--blue)' }}>ธนาคารหลอกไม่ได้</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div data-reveal="1" className="relative overflow-hidden rounded-[2.5rem] bg-white p-9 md:p-12" style={{ boxShadow: '0 0 0 1px rgba(0,24,71,0.07)' }}>
              <span
                className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'var(--fake-pale)', color: 'var(--fake)' }}
              >
                <X className="h-7 w-7" strokeWidth={3} />
              </span>
              <span className="mb-3 block text-sm font-bold" style={{ color: 'var(--fake)' }}>
                ไม่ปลอดภัย
              </span>
              <h3 className="mb-4 text-2xl font-extrabold md:text-3xl" style={{ color: 'var(--navy)' }}>
                OCR / AI อ่านภาพสลิป
              </h3>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                แอปสร้างสลิปปลอมมีให้ดาวน์โหลดฟรีบนมือถือ AI วิเคราะห์ภาพถูกหลอกได้ง่าย ไม่ว่าระบบจะฉลาดแค่ไหน
              </p>
            </div>

            <div data-reveal="2" className="relative overflow-hidden rounded-[2.5rem] p-9 md:p-12" style={{ background: 'var(--navy)' }}>
              <div
                aria-hidden
                className="absolute -right-16 -top-16 h-56 w-56 rounded-full"
                style={{ background: 'var(--blue)', opacity: 0.5 }}
              />
              <span
                className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
              >
                <Check className="h-7 w-7" strokeWidth={3} />
              </span>
              <span className="relative mb-3 block text-sm font-bold" style={{ color: 'var(--cyan)' }}>
                ปลอดภัย 100%
              </span>
              <h3 className="relative mb-4 text-2xl font-extrabold text-white md:text-3xl">ยืนยันผ่าน Bank Gateway</h3>
              <p className="relative text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                ผลมาจากธนาคารโดยตรง ปลอมแปลงไม่ได้ ไม่ว่าสลิปจะถูกสร้างมาอย่างดีแค่ไหน ระบบธนาคารไม่มีรายการนั้น
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {extras.map((item, i) => (
              <div
                key={item.title}
                data-reveal={i}
                className="rounded-[1.75rem] p-7 transition-colors hover:bg-[var(--blue-pale)]"
                style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0 0 0 1px rgba(0,24,71,0.07)' }}
              >
                <span
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
                  style={{ background: 'var(--blue)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <p className="mb-1.5 text-base font-bold" style={{ color: 'var(--navy)' }}>
                  {item.title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 steps ─────────────────────────────────────────── */}
      <section className="px-4 py-4 md:px-8">
        <div
          className="mx-auto max-w-5xl rounded-[2.5rem] px-6 py-14 md:rounded-[3.5rem] md:px-14 md:py-20"
          style={{ background: 'var(--blue-pale)' }}
        >
          <div data-reveal className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-extrabold leading-[1.2] md:text-6xl" style={{ color: 'var(--navy)' }}>
              พร้อมใช้งานใน
              <br />
              <span style={{ color: 'var(--blue)' }}>3 ขั้นตอน</span>
            </h2>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-white py-2 pl-6 pr-2 text-sm font-bold transition-transform hover:scale-[1.03]"
              style={{ color: 'var(--navy)' }}
            >
              สมัครฟรีเลย
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full transition-transform group-hover:rotate-45"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <div className="relative grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.num}
                data-reveal={i}
                className="relative rounded-[2rem] bg-white p-8 transition-transform duration-300 hover:-translate-y-1.5 md:p-9"
              >
                <span
                  className="font-display mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-extrabold"
                  style={{
                    background: i === 1 ? 'var(--cyan)' : i === 2 ? 'var(--blue)' : 'var(--navy)',
                    color: i === 1 ? 'var(--navy)' : '#fff',
                  }}
                >
                  {step.num}
                </span>
                <h3 className="mb-3 text-xl font-extrabold leading-snug" style={{ color: 'var(--navy)' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed md:text-base" style={{ color: 'var(--text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div data-reveal className="self-start lg:sticky lg:top-28">
            <SectionTag>FAQ</SectionTag>
            <h2 className="font-display mb-5 text-4xl font-extrabold leading-[1.2] md:text-5xl" style={{ color: 'var(--navy)' }}>
              คำถาม
              <br />
              <span style={{ color: 'var(--blue)' }}>ที่พบบ่อย</span>
            </h2>
            <p className="mb-6 text-base" style={{ color: 'var(--text-muted)' }}>
              ไม่เจอคำตอบที่ต้องการ?
            </p>
            <a
              href="mailto:hello@flowslip.ai"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold transition-colors hover:bg-[var(--blue-pale)]"
              style={{ color: 'var(--navy)', boxShadow: '0 0 0 1.5px rgba(0,24,71,0.12)' }}
            >
              ติดต่อเราโดยตรง
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={faq.q} data-reveal={Math.min(i, 3)}>
                <FAQItem q={faq.q} a={faq.a} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="px-4 pb-4 md:px-8">
        <div
          data-reveal
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem]"
          style={{ background: 'var(--navy)' }}
        >
          <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full" style={{ background: 'var(--blue)', opacity: 0.55 }} />
          <div aria-hidden className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full" style={{ background: 'var(--cyan)', opacity: 0.14 }} />

          <div className="relative px-7 py-16 md:px-14 md:py-24">
            <div className="grid items-end gap-10 md:grid-cols-[1fr_auto]">
              <div>
                <span
                  className="mb-6 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--cyan)' }}
                >
                  เริ่มต้นวันนี้
                </span>
                <h2
                  className="font-display mb-6 text-[2.8rem] font-extrabold leading-[1.15] text-white sm:text-6xl lg:text-7xl"
                >
                  ปกป้องธุรกิจ
                  <br />
                  ของคุณจาก
                  <br />
                  <span style={{ color: 'var(--cyan)' }}>สลิปปลอม</span>
                </h2>
                <p className="max-w-md text-base leading-relaxed md:text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  เชื่อมต่อ LINE OA ภายใน 5 นาที ไม่ต้องเขียนโค้ด ไม่ต้องติดตั้งอะไรเพิ่ม
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-between gap-4 rounded-full py-2 pl-8 pr-2 text-base font-bold transition-transform hover:scale-[1.03]"
                  style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
                >
                  สมัครใช้งานฟรี
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:rotate-45"
                    style={{ background: 'var(--navy)', color: 'var(--cyan)' }}
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10"
                  style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.3)' }}
                >
                  ดูแผนราคา
                </Link>
              </div>
            </div>

            <div className="mt-14 flex flex-wrap gap-2 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              {['ฟรี 20 สลิป/เดือน', 'ไม่ต้องใช้บัตรเครดิต', 'ยกเลิกได้ทุกเมื่อ', 'รองรับทุกธนาคารไทย', ...trust].map((t) => (
                <span
                  key={t}
                  className="rounded-full px-4 py-1.5 text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
