import React from 'react';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "฿0",
      desc: "สำหรับทดสอบระบบ",
      features: ["10 รายการ/เดือน", "สแกน QR Code พื้นฐาน", "API Access"]
    },
    {
      name: "Starter",
      price: "฿490",
      desc: "สำหรับธุรกิจขนาดเล็ก",
      features: ["500 รายการ/เดือน", "Line OA Webhook", "Support 24/7"]
    },
    {
      name: "Pro",
      price: "฿1,290",
      desc: "สำหรับธุรกิจที่เติบโต",
      features: ["ไม่จำกัดรายการ", "AI Forensic Analysis", "Custom Integration"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="text-5xl font-bold mb-6 text-zinc-900 tracking-tight">ราคาค่าบริการ</h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto font-medium">เริ่มต้นใช้งานฟรี หรือเลือกแผนที่คุ้มค่าที่สุดสำหรับคุณ</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <div key={i} className="bg-white border border-zinc-100 p-12 rounded-[2rem] hover:border-zinc-900 transition-all duration-500 group">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">{p.name}</p>
              <h3 className="text-4xl font-bold mb-2 text-zinc-900 tracking-tight">{p.price} <span className="text-sm font-medium text-zinc-400">/เดือน</span></h3>
              <p className="text-zinc-500 mb-10 font-medium text-sm">{p.desc}</p>
              <ul className="space-y-4 mb-10">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-zinc-700 font-bold text-xs">
                    <Check className="w-4 h-4 text-zinc-300" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 rounded-xl border border-zinc-200 font-bold text-sm group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all">
                เลือกแผนนี้
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
