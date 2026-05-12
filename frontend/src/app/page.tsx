import React from 'react';
import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { Marquee } from '@/components/landing/Marquee';
import { Features } from '@/components/landing/Features';

const stats = [
  { value: '4.2M+', label: 'สลิปที่ตรวจสอบแล้ว' },
  { value: '99.9%', label: 'ความแม่นยำในการตรวจสอบ' },
  { value: '60+', label: 'ธุรกิจที่ใช้งานอยู่' },
  { value: '<1s', label: 'เวลาประมวลผลเฉลี่ย' },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Marquee />

      {/* Trust Stats */}
      <section className="border-b border-zinc-200 bg-blue-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-blue-400">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center px-8">
                <p className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-blue-50 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Features />

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-12 md:p-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4">
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">/ GET STARTED</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 leading-tight">
                เริ่มปกป้องธุรกิจของคุณ<br />
                จากสลิปปลอมตั้งแต่วันนี้
              </h2>
              <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
                ติดตั้ง API ภายใน 5 นาที หรือเชื่อมต่อผ่าน LINE OA Webhook ได้ทันที
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/verify"
                className="bg-blue-800 text-white px-8 py-4 text-sm font-semibold hover:bg-blue-900 transition-colors rounded-full"
              >
                สมัครใช้งานฟรี →
              </Link>
              <Link
                href="/docs"
                className="border border-zinc-200 text-zinc-600 px-8 py-4 text-sm hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                ดู Docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
