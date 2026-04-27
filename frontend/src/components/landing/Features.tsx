'use client';

import React from 'react';
import { Fingerprint, Clock, Lock, Cpu, Server, Network } from 'lucide-react';

const features = [
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "AI Forensic Core",
    label: "ENGINE_01",
    desc: "ระบบวิเคราะห์พิกเซลเชิงลึกเพื่อตรวจจับการปลอมแปลงและรอยตัดต่อสลิปแบบอัตโนมัติ"
  },
  {
    icon: <Network className="w-6 h-6" />,
    title: "Direct Bank Sync",
    label: "NODE_STABLE",
    desc: "เชื่อมต่อตรงกับ API Gateway ของธนาคารชั้นนำ ตรวจสอบข้อมูลจากต้นทางได้ทันที"
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: "Secure Processing",
    label: "TLS_1.3_ACTIVE",
    desc: "ประมวลผลข้อมูลผ่านระบบเข้ารหัสมาตรฐานสูงสุด โดยไม่เก็บข้อมูลส่วนตัวของลูกค้า"
  }
];

export const Features = () => {
  return (
    <section className="py-32 px-6 bg-white border-y border-zinc-100">
      <div className="max-w-7xl mx-auto">
        
        <div className="grid md:grid-cols-3 gap-0 border border-zinc-100 rounded-[2.5rem] overflow-hidden">
          {features.map((f, i) => (
            <div key={i} className="p-12 border-zinc-100 md:border-r last:border-r-0 hover:bg-zinc-50 transition-all duration-700 group relative">
              {/* Technical Marker - Crafted Detail */}
              <div className="absolute top-6 right-8 font-mono text-[9px] font-bold text-zinc-300 tracking-[0.3em]">
                {f.label}
              </div>
              
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-10 group-hover:bg-[#7C3AED] transition-colors duration-500 shadow-xl shadow-zinc-900/10 group-hover:rotate-6 transition-transform">
                {f.icon}
              </div>
              
              <h3 className="text-2xl font-black mb-4 tracking-tighter text-zinc-900 uppercase italic">
                {f.title}
              </h3>
              
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                {f.desc}
              </p>

              {/* Bottom detail line */}
              <div className="mt-10 h-1 w-0 bg-[#7C3AED] group-hover:w-full transition-all duration-700"></div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-between items-center px-4">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest text-zinc-400">All Systems Operational</span>
           </div>
           <div className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
              SLIPSURE_METADATA_COMPLIANT
           </div>
        </div>

      </div>
    </section>
  );
};
