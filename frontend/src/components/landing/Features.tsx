'use client';

import React from 'react';
import { QrCode, ShieldCheck, Database, FileSearch, Zap, Lock } from 'lucide-react';

const features = [
  {
    icon: <QrCode className="w-6 h-6" />,
    title: "QR Payload Extraction",
    label: "IMAGE_SCAN",
    desc: "ดึงข้อมูลจาก QR Code ในภาพสลิปได้อย่างรวดเร็วและแม่นยำ แม้ภาพจะมีความชัดเจนต่ำ"
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Official Bank Verify",
    label: "BANK_VERIFY",
    desc: "ยืนยันความถูกต้องของข้อมูลผ่าน Gateway ธนาคารโดยตรง มั่นใจได้ในความถูกต้อง 100%"
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "Transaction Integrity",
    label: "DATA_ENCRYPT",
    desc: "ตรวจสอบความซ้ำซ้อนของรายการ (Double Spend) เพื่อป้องกันการนำสลิปเก่ามาใช้งานใหม่"
  }
];

export const Features = () => {
  return (
    <section className="py-32 px-6 bg-white border-y border-zinc-100">
      <div className="max-w-7xl mx-auto">
        
        <div className="grid md:grid-cols-3 gap-0 border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
          {features.map((f, i) => (
            <div key={i} className="p-12 border-zinc-100 md:border-r last:border-r-0 hover:bg-[#fafafa] transition-all duration-500 group relative">
              <div className="absolute top-6 right-8 font-mono text-[9px] font-bold text-zinc-300 tracking-[0.3em]">
                {f.label}
              </div>
              
              <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-10 group-hover:bg-[#4F46E5] transition-colors duration-500 shadow-xl shadow-zinc-900/10">
                {f.icon}
              </div>
              
              <h3 className="text-xl font-bold mb-4 tracking-tight text-zinc-900 uppercase">
                {f.title}
              </h3>
              
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col md:flex-row justify-between items-center px-4 gap-6">
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] font-mono font-black text-emerald-600 uppercase tracking-widest">Gateway_Online</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">latency: &lt;200ms</span>
           </div>
           <div className="flex items-center gap-4 text-zinc-300">
              <Zap className="w-4 h-4" />
              <Lock className="w-4 h-4" />
              <Database className="w-4 h-4" />
           </div>
        </div>

      </div>
    </section>
  );
};
