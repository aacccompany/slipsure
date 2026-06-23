'use client';

import React from 'react';
import { Store, Globe, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    icon: Store,
    number: '01',
    tag: 'E-commerce',
    title: 'ร้านค้าออนไลน์',
    desc: 'ตรวจสอบสลิปอัตโนมัติทุกครั้งที่ลูกค้าชำระเงิน ลดภาระตรวจสอบด้วยมือและป้องกันสลิปปลอมได้ 100%',
  },
  {
    icon: MessageSquare,
    number: '02',
    tag: 'LINE OA',
    title: 'เชื่อมต่อ LINE OA',
    desc: 'ลูกค้าส่งสลิปผ่าน LINE แล้วได้ผลยืนยันอัตโนมัติทันที ไม่ต้องเปิดแอปเพิ่ม ตั้งค่าภายใน 5 นาที',
  },
  {
    icon: Globe,
    number: '03',
    tag: 'REST API',
    title: 'เชื่อมต่อผ่าน API',
    desc: 'มี REST API พร้อมใช้งาน เชื่อมต่อเข้ากับระบบ POS ระบบหลังร้าน หรือแอปของคุณได้เลยทันที',
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
    <div className="min-h-screen pt-32 pb-24 px-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern absolute inset-0 pointer-events-none top-0" />

      <div className="relative max-w-7xl mx-auto">

        {/* หัวข้อ */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'var(--blue)' }} />
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              บริการของเรา
            </span>
            <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'var(--blue)' }} />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold mb-5 leading-tight" style={{ color: 'var(--navy)' }}>
            ใช้งานได้กับ<br />
            <em style={{ color: 'var(--blue)', fontWeight: '800' }}>ทุกประเภทธุรกิจ</em>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            ไม่ว่าจะเป็นร้านค้าออนไลน์ ร้านค้าทั่วไป หรือแอปพลิเคชัน
            FlowSlip พร้อมให้บริการตรวจสอบสลิปในรูปแบบที่เหมาะกับคุณ
          </p>
        </div>

        {/* การ์ดบริการ */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {services.map((s) => (
            <div
              key={s.number}
              className="group p-8 transition-all duration-300"
              style={{ background: '#fff', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--blue)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-subtle)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.background = '#fff';
              }}
            >
              <div className="font-display text-5xl font-semibold mb-6" style={{ color: 'var(--border-strong)' }}>
                {s.number}
              </div>
              <div className="inline-flex p-3 mb-5" style={{ background: 'var(--bg-subtle)' }}>
                <s.icon className="w-5 h-5" style={{ color: 'var(--navy)' }} />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--blue)' }}>
                {s.tag}
              </p>
              <h3 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--navy)' }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {s.desc}
              </p>
              <div className="mt-5 h-[2px] w-0 group-hover:w-10 transition-all duration-300"
                style={{ background: 'var(--blue)' }} />
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden p-12 md:p-16" style={{ background: 'var(--navy)' }}>
          <div className="thai-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.07 }} />
          <div className="absolute top-6 right-10 w-28 h-28 opacity-[0.07] rotate-45" style={{ background: 'var(--blue)' }} />
          <div className="absolute bottom-6 left-8 w-16 h-16 opacity-[0.07] rotate-45" style={{ background: 'var(--cyan)' }} />

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'var(--blue)' }} />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,82,255,0.6)' }}>
                  เริ่มต้นได้เลย
                </span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight" style={{ color: 'rgba(248,250,252,0.95)' }}>
                พร้อมปกป้อง<br />
                <em style={{ color: 'var(--cyan)', fontWeight: '800' }}>ธุรกิจของคุณ?</em>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(248,250,252,0.5)' }}>
                สมัครฟรีวันนี้ รับโควต้า 50 สลิปต่อเดือน
                ไม่ต้องใช้บัตรเครดิต ยกเลิกได้ทุกเมื่อ
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--blue)', color: '#fff', borderRadius: '2px' }}
                >
                  สมัครใช้งานฟรี →
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium border transition-all hover:opacity-75"
                  style={{ borderColor: 'rgba(0,82,255,0.35)', color: 'rgba(248,250,252,0.7)', borderRadius: '2px' }}
                >
                  ดูแผนราคา
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-6"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,82,255,0.15)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
                    style={{ color: 'rgba(248,250,252,0.4)' }}>
                    {stat.label}
                  </p>
                  <p className="font-display text-3xl font-semibold" style={{ color: 'var(--blue)' }}>
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
