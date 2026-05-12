'use client';

import React from 'react';
import { QrCode, ShieldCheck, Database } from 'lucide-react';

const features = [
  {
    icon: <QrCode className="w-5 h-5" />,
    title: 'QR Payload Extraction',
    desc: 'ดึงข้อมูลจาก QR Code ในภาพสลิปได้อย่างรวดเร็วและแม่นยำ แม้ภาพจะมีความชัดเจนต่ำ',
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'Official Bank Verify',
    desc: 'ยืนยันความถูกต้องของข้อมูลผ่าน Gateway ธนาคารโดยตรง ไม่ใช่การ OCR หรือเดาจากภาพ',
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: 'Transaction Integrity',
    desc: 'ตรวจสอบความซ้ำซ้อนของรายการ (Double Spend) เพื่อป้องกันการนำสลิปเก่ามาใช้งานใหม่',
  },
];

export const Features = () => {
  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto">

        <div className="border-b border-zinc-200 px-8 py-3 flex items-center justify-between">
          <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest">/ HOW IT WORKS</span>
          <span className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest">3 STEPS</span>
        </div>

        <div className="grid md:grid-cols-3 divide-x divide-zinc-200">
          {features.map((f, i) => (
            <div key={f.title} className="p-10 group hover:bg-zinc-50 transition-colors">
              <div className="font-mono text-[11px] text-zinc-300 mb-6">0{i + 1}</div>
              <div className="mb-5 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-3 tracking-tight uppercase">
                {f.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
