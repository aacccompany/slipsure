import React from 'react';
import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { Marquee } from '@/components/landing/Marquee';
import { Features } from '@/components/landing/Features';
import { ArrowUpRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Marquee />
      <Features />

      {/* Trust & CTA Section */}
      <section className="py-32 px-6 bg-white border-b border-zinc-100">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
           <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-8 leading-tight text-balance">
              เริ่มปกป้องธุรกิจของคุณจากสลิปปลอมตั้งแต่วันนี้
           </h2>
           <p className="text-lg text-zinc-500 mb-12 max-w-xl mx-auto text-balance">
             ใช้เวลาเพียง 5 นาทีในการติดตั้ง API หรือใช้งานผ่าน Line OA Webhook 
             เพื่อความมั่นใจในทุกยอดโอนเงิน
           </p>
           <div className="flex justify-center">
              <Link href="/verify" className="bg-zinc-900 text-white px-12 py-5 rounded-xl font-bold text-lg hover:bg-black transition-all flex items-center gap-3 shadow-lg shadow-zinc-900/10 group">
                สมัครใช้งานฟรี
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
           </div>
        </div>
      </section>
    </main>
  );
}
