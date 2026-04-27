'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, QrCode, Activity, FileCheck, Scan } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden bg-white">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '80px 80px' }}></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-8 space-y-10 animate-fade-in">
            <div className="flex items-center gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-md">
                <Activity className="w-3.5 h-3.5 text-zinc-900" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900">Engine_V2_Stable</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest hidden sm:block">
                Protocol: JSON_REST_API
              </div>
            </div>
            
            <h1 className="text-6xl md:text-[8rem] leading-[0.8] font-black tracking-tighter text-zinc-900 uppercase">
              SCAN <br/>
              <span className="text-zinc-300 italic">VERIFY.</span> <br/>
              SECURE.
            </h1>
            
            <div className="max-w-xl pl-6 border-l-4 border-zinc-900">
               <p className="text-xl md:text-2xl text-zinc-500 font-medium leading-relaxed">
                 ระบบตรวจสอบความถูกต้องของสลิปโอนเงินที่แม่นยำที่สุด 
                 ด้วยเทคโนโลยีวิเคราะห์พิกเซลและการยืนยันผ่าน Gateway ธนาคาร
               </p>
            </div>

            <div className="flex flex-wrap gap-8 pt-6">
               <div className="flex items-center gap-3 text-zinc-400">
                  <Scan className="w-5 h-5" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest">QR_Payload_Extraction</span>
               </div>
               <div className="flex items-center gap-3 text-zinc-400">
                  <FileCheck className="w-5 h-5" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest">Image_Pixel_Forensics</span>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 lg:pt-32">
             <div className="bg-zinc-900 p-10 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                   <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-8 border border-white/10">
                      <QrCode className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter italic">Bank Connector</h3>
                   <p className="text-zinc-400 text-sm font-medium mb-12 leading-relaxed">
                     เชื่อมต่อ Gateway ธนาคารชั้นนำโดยตรง พร้อมรับข้อมูลยืนยันจากต้นทางในรูปแบบที่โปรแกรมเมอร์นำไปใช้งานต่อได้ทันที
                   </p>
                   <Link href="/verify" className="flex items-center justify-between w-full bg-white text-zinc-900 hover:bg-zinc-200 p-5 rounded-lg transition-all duration-300">
                      <span className="font-black text-sm uppercase tracking-widest">Start Scanning</span>
                      <ArrowRight className="w-5 h-5" />
                   </Link>
                </div>
                {/* Visual Decoration Only */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                   <Scan className="w-64 h-64 text-white -rotate-12" />
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};
