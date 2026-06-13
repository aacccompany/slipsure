'use client';

import React from 'react';
import { ShieldCheck, Zap, Globe, Smartphone, Store, Code, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    title: "E-commerce Integration",
    icon: <Store className="w-8 h-8 text-blue-800" />,
    description: "ตรวจสอบสลิปอัตโนมัติสำหรับร้านค้าออนไลน์ ช่วยลดภาระการตรวจสอบด้วยมือและป้องกันความผิดพลาด"
  },
  {
    title: "Mobile App SDK",
    icon: <Smartphone className="w-8 h-8 text-blue-800" />,
    description: "ชุดพัฒนาซอฟต์แวร์สำหรับ Android และ iOS เพื่อเพิ่มระบบตรวจสอบสลิปภายในแอปของคุณโดยตรง"
  },
  {
    title: "Custom Solutions",
    icon: <Globe className="w-8 h-8 text-blue-800" />,
    description: "ออกแบบระบบตรวจสอบสลิปให้เข้ากับ Workflow เฉพาะขององค์กรคุณ พร้อมทีมงานให้คำปรึกษา"
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-6 leading-tight">
            โซลูชันสำหรับ <br/><span className="text-blue-800">ทุกประเภทธุรกิจ</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg leading-relaxed">
            ไม่ว่าคุณจะเป็นร้านค้าขนาดเล็กหรือองค์กรระดับมหาชน เรามีเครื่องมือที่พร้อมตอบโจทย์การเติบโตของคุณ
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-32">
          {services.map((s, i) => (
            <div key={i} className="group p-10 bg-[#fafafa] border border-zinc-100 rounded-[3rem] hover:bg-white hover:border-blue-50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 text-center">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-4">{s.title}</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 rounded-[4rem] p-10 md:p-20 text-white relative overflow-hidden">
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                        พร้อมที่จะยกระดับ <br/>
                        <span className="text-blue-700">ความปลอดภัยของธุรกิจ?</span>
                    </h2>
                    <p className="text-zinc-400 font-medium text-lg">
                        ลงชื่อใช้งานวันนี้เพื่อสัมผัสประสบการณ์การตรวจสอบสลิปที่เร็วที่สุดในประเทศไทย
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/register" className="bg-blue-800 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                            เริ่มใช้งานฟรี
                        </Link>
                        <Link href="#" className="bg-zinc-800 text-white px-10 py-4 rounded-2xl font-bold hover:bg-zinc-700 transition-all active:scale-95">
                            ปรึกษาฝ่ายขาย
                        </Link>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {[
                        { label: "Active Users", value: "10,000+" },
                        { label: "Verified Slips", value: "2M+" },
                        { label: "Uptime", value: "99.99%" },
                        { label: "API Speed", value: "<1s" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem]">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Background Decorative */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/5 rounded-full blur-[100px] -ml-48 -mb-48" />
        </div>
      </div>
    </div>
  );
}
