'use client';

import React from 'react';
import { Fingerprint, Clock, Lock } from 'lucide-react';

const features = [
  {
    icon: <Fingerprint className="w-6 h-6 text-[#7C3AED]" />,
    title: "AI Forensic Analysis",
    desc: "เทคโนโลยีขั้นสูงในการวิเคราะห์พิกเซลเพื่อตรวจจับร่องรอยการตัดต่อภาพสลิปที่ซับซ้อน"
  },
  {
    icon: <Clock className="w-6 h-6 text-[#7C3AED]" />,
    title: "Instant Response",
    desc: "ประมวลผลและแสดงผลลัพธ์ในเสี้ยววินาที ช่วยให้ธุรกิจของคุณไม่พลาดทุกโอกาสสำคัญ"
  },
  {
    icon: <Lock className="w-6 h-6 text-[#7C3AED]" />,
    title: "Bank Connectivity",
    desc: "เชื่อมต่อตรงกับ Gateway ธนาคารชั้นนำในไทย มั่นใจได้ในความถูกต้องของข้อมูล 100%"
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-6 bg-[#f9fafb] border-y border-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
           <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4 text-balance">ฟีเจอร์ระดับมาตรฐานสถาบันการเงิน</h2>
           <p className="text-zinc-500 font-medium text-balance">ทุกเครื่องมือถูกออกแบบมาเพื่อความปลอดภัยสูงสุดของธุรกิจคุณ</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm hover:border-[#7C3AED] transition-all duration-500 group">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-8 border border-violet-100">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-4 text-zinc-900 tracking-tight">{f.title}</h3>
              <p className="text-zinc-500 font-medium leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
