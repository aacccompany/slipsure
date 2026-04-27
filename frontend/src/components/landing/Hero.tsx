'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Activity, Database, Fingerprint } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden">
      {/* Precision Grid Lines - Crafted Feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '100px 100px' }}></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-12 gap-20 items-start">
          
          <div className="lg:col-span-8 space-y-12 animate-fade-in">
            <div className="flex items-center gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-md">
                <Activity className="w-3 h-3 text-[#7C3AED]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#7C3AED]">System_Active</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest hidden sm:block">
                Region: TH_BANGKOK_SECURE
              </div>
            </div>
            
            <h1 className="text-7xl md:text-[9rem] leading-[0.8] font-black tracking-tight text-zinc-900 uppercase">
              HIGH <br/>
              PRECISION <br/>
              <span className="text-[#7C3AED]">SECURE.</span>
            </h1>
            
            <div className="max-w-xl space-y-8">
               <p className="text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed border-l-4 border-[#7C3AED] pl-6">
                 เทคโนโลยีตรวจสอบพิกเซลและฐานข้อมูลธนาคารแบบ Real-time ที่ถูกออกแบบมาเพื่อความแม่นยำระดับสูงสุดในทุกรายการ
               </p>
               
               <div className="flex flex-wrap gap-8 pt-4">
                  <div className="flex items-center gap-3">
                     <Database className="w-5 h-5 text-zinc-300" />
                     <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Bank_Node_Sync</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <Fingerprint className="w-5 h-5 text-zinc-300" />
                     <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">AI_Forensic_Ready</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 lg:pt-32">
             <div className="bg-zinc-900 p-10 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
                <div className="relative z-10">
                   <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter italic">Enterprise Integration</h3>
                   <p className="text-zinc-400 text-sm font-medium mb-12 leading-relaxed">
                     เชื่อมต่อ API หรือ Webhook เข้ากับระบบของคุณได้ทันที พร้อมคู่มือการติดตั้งที่ละเอียดที่สุด
                   </p>
                   <Link href="/verify" className="flex items-center justify-between w-full bg-[#7C3AED] hover:bg-white hover:text-black p-5 rounded-xl transition-all duration-500 group">
                      <span className="font-black text-sm uppercase tracking-[0.2em]">Start Engine</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                   </Link>
                </div>
                {/* Custom Layered Background Icon */}
                <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                   <ShieldCheck className="w-48 h-48 text-white rotate-12" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white border border-zinc-100 rounded-2xl">
                   <p className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest mb-2">Uptime</p>
                   <p className="text-2xl font-black text-zinc-900 tracking-tighter italic">99.9%</p>
                </div>
                <div className="p-6 bg-white border border-zinc-100 rounded-2xl">
                   <p className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest mb-2">Latency</p>
                   <p className="text-2xl font-black text-zinc-900 tracking-tighter italic">&lt; 0.8s</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};
