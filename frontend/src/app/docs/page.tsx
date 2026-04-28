'use client';

import React from 'react';
import { Book, Code, Terminal, MessageSquare, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const sections = [
  {
    title: "เริ่มต้นใช้งาน (Getting Started)",
    icon: <Zap className="w-5 h-5 text-emerald-600" />,
    items: [
      { name: "การขอ API Key", href: "#" },
      { name: "โครงสร้าง Request/Response", href: "#" },
      { name: "Rate Limits", href: "#" }
    ]
  },
  {
    title: "Endpoints",
    icon: <Terminal className="w-5 h-5 text-emerald-600" />,
    items: [
      { name: "POST /verify-slip", href: "#" },
      { name: "GET /check-balance", href: "#" },
      { name: "Webhook Setup", href: "#" }
    ]
  },
  {
    title: "SDKs & Libraries",
    icon: <Code className="w-5 h-5 text-emerald-600" />,
    items: [
      { name: "Python Library", href: "#" },
      { name: "Node.js SDK", href: "#" },
      { name: "PHP Example", href: "#" }
    ]
  }
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-10 hidden lg:block">
            {sections.map((section, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm uppercase tracking-widest">
                  {section.icon}
                  {section.title}
                </div>
                <div className="flex flex-col gap-2 pl-7">
                  {section.items.map((item, j) => (
                    <a key={j} href={item.href} className="text-sm font-medium text-zinc-500 hover:text-emerald-600 transition-colors">
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-12">
            <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 md:p-16 shadow-sm">
                <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-6 tracking-tight">API Documentation</h1>
                <p className="text-zinc-500 font-medium text-lg leading-relaxed mb-10">
                    เชื่อมต่อระบบตรวจสอบสลิปเข้ากับแอปพลิเคชันของคุณได้ง่ายๆ 
                    ด้วย RESTful API ที่มีความปลอดภัยและเสถียรภาพสูง
                </p>

                <div className="p-8 bg-zinc-900 rounded-[2rem] text-white space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Request Example</span>
                        <div className="flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                    </div>
                    <pre className="font-mono text-sm text-emerald-400 overflow-x-auto">
{`curl -X POST https://api.slipsure.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@slip.jpg"`}
                    </pre>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 hover:border-emerald-100 transition-all shadow-sm group">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-3">ต้องการความช่วยเหลือ?</h3>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-6">
                        ทีมวิศวกรของเราพร้อมช่วยเหลือคุณในการเชื่อมต่อระบบตลอด 24 ชั่วโมง
                    </p>
                    <Link href="#" className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm hover:gap-3 transition-all">
                        คุยกับทีมงาน Support <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 hover:border-emerald-100 transition-all shadow-sm group">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-3">Community & Showcases</h3>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-6">
                        ดูตัวอย่างโปรเจกต์ที่ใช้งาน Slipsure และร่วมพูดคุยกับเหล่านักพัฒนา
                    </p>
                    <Link href="#" className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm hover:gap-3 transition-all">
                        เข้าสู่ Community <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
