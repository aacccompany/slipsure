'use client';

import React from 'react';
import { ShieldCheck, Zap, BarChart3, Fingerprint, Globe, Lock } from 'lucide-react';

const features = [
  {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    title: "ยืนยันผลจริง 100%",
    description: "ตรวจสอบข้อมูลผ่าน Gateway ของธนาคารโดยตรง ไม่ใช่แค่การอ่าน OCR ทั่วไป"
  },
  {
    icon: <Zap className="w-6 h-6 text-emerald-600" />,
    title: "ประมวลผลทันใจ",
    description: "สแกนและยืนยันข้อมูลเสร็จสิ้นภายในเวลาไม่ถึง 1 วินาที เหมาะสำหรับระบบที่ต้องการความเร็ว"
  },
  {
    icon: <Lock className="w-6 h-6 text-emerald-600" />,
    title: "ปลอดภัยสูงสุด",
    description: "เข้ารหัสข้อมูลทุกขั้นตอน และไม่มีการจัดเก็บรูปภาพสลิปส่วนตัวลงในฐานข้อมูล"
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-emerald-600" />,
    title: "Dashboard วิเคราะห์ผล",
    description: "มาพร้อมระบบรายงานสถิติการใช้งาน และการแจ้งเตือนเมื่อพบสลิปปลอมหรือสลิปใช้ซ้ำ"
  },
  {
    icon: <Fingerprint className="w-6 h-6 text-emerald-600" />,
    title: "ป้องกันสลิปใช้ซ้ำ",
    description: "ระบบตรวจสอบเลขอ้างอิงอัจฉริยะ ป้องกันการนำสลิปเดิมมาใช้ใหม่ในระบบของคุณ"
  },
  {
    icon: <Globe className="w-6 h-6 text-emerald-600" />,
    title: "API สำหรับทุกภาษา",
    description: "รองรับการเชื่อมต่อผ่าน REST API ที่เข้าใจง่าย พร้อมเอกสารประกอบครบถ้วนสำหรับนักพัฒนา"
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mb-4">จุดเด่นของระบบ</h2>
          <h3 className="text-4xl font-black text-zinc-900 tracking-tight">ทำไมต้องเลือก Slipsure.ai?</h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-[#fafafa] border border-zinc-100 rounded-[2.5rem] hover:bg-white hover:border-emerald-100 hover:shadow-2xl hover:shadow-emerald-600/5 transition-all duration-500">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h4 className="text-xl font-bold text-zinc-900 mb-3">{f.title}</h4>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
