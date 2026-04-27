import React from 'react';
import { Bot, Webhook, Code2, Boxes, CheckCircle2 } from 'lucide-react';

export default function ServicesPage() {
  const services = [
    { 
      icon: <Bot className="w-6 h-6" />, 
      title: "Line Chatbot", 
      desc: "แชทบอทเช็กสลิปปลอมสุดล้ำ เหมาะกับธุรกิจที่มีหน้าร้าน หรือมีกลุ่มไลน์ส่งรูปสลิปเพื่อตรวจอยู่แล้ว",
      features: ["ติดตั้งง่ายใน 1 นาที", "แจ้งเตือนทันทีในกลุ่ม Line", "สรุปยอดรายวัน"]
    },
    { 
      icon: <Webhook className="w-6 h-6" />, 
      title: "LINE OA Webhook", 
      desc: "อีกขั้นของการเช็กสลิปโอนเงิน ที่ประหยัดเวลาคนทำงาน แถมไม่ต้องเซฟสลิปซ้ำซ้อน",
      features: ["เชื่อมต่อกับ LINE OA เดิมได้", "ตอบกลับลูกค้าอัตโนมัติ", "รองรับหลาย Admin"]
    },
    { 
      icon: <Code2 className="w-6 h-6" />, 
      title: "API Integration", 
      desc: "เอาใจสาย Dev เช็กสลิปโอนเงินละเอียดยิบ! เพียงฝังโค้ดของเราบนเว็บไซต์ของคุณ",
      features: ["JSON Response ละเอียด", "Uptime 99.9%", "SDK รองรับหลายภาษา"]
    },
    { 
      icon: <Boxes className="w-6 h-6" />, 
      title: "Universal Web Integration", 
      desc: "รองรับทุกเว็บไซต์! เพียงวาง Code Snippet บรรทัดเดียว ระบบตรวจสอบสลิปจะพร้อมใช้งานทันที",
      features: ["ติดตั้งง่ายด้วย Script บรรทัดเดียว", "รองรับทุก Platform (HTML, React, PHP)", "ปรับแต่งดีไซน์ได้"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="text-5xl font-bold mb-6 text-zinc-900 tracking-tight">บริการของเรา</h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto font-medium">เลือกโซลูชันที่เหมาะสมที่สุดสำหรับขนาดและรูปแบบธุรกิจของคุณ</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {services.map((s, i) => (
            <div key={i} className="bg-white border border-zinc-100 p-12 rounded-[2rem] hover:border-zinc-900 transition-all duration-500 group">
              <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-8 border border-zinc-50 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                {s.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 tracking-tight">{s.title}</h3>
              <p className="text-zinc-500 mb-8 leading-relaxed font-medium">{s.desc}</p>
              <ul className="space-y-4">
                {s.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-zinc-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
