'use client';

import React from 'react';
import { Check, Zap, Shield, Crown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: "Free",
    price: "0",
    description: "สำหรับทดสอบและใช้งานส่วนตัว",
    features: ["10 รายการ / เดือน", "ตรวจสอบผ่าน Direct API", "REST API Access", "Email Support"],
    button: "เริ่มใช้งานฟรี",
    highlight: false
  },
  {
    name: "Pro",
    price: "990",
    description: "สำหรับธุรกิจขนาดเล็กและร้านค้า",
    features: ["1,000 รายการ / เดือน", "ตรวจสอบได้ทุกธนาคาร", "Dashboard รายงานผล", "Priority Support", "Webhooks Notification"],
    button: "สมัครสมาชิก",
    highlight: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "สำหรับองค์กรขนาดใหญ่",
    features: ["ไม่จำกัดรายการ", "Custom Integration", "Dedicated Account Manager", "SLA Guarantee", "On-Premise Solution"],
    button: "ติดต่อเรา",
    highlight: false
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-6">
            เลือกแผนที่ <span className="text-emerald-600">ใช่สำหรับคุณ</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg leading-relaxed">
            ไม่มีค่าใช้จ่ายแอบแฝง เลือกปรับเปลี่ยนแผนได้ตามการเติบโตของธุรกิจคุณ
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`
                relative p-10 rounded-[3rem] border transition-all duration-500
                ${plan.highlight 
                  ? 'bg-zinc-900 border-zinc-800 shadow-2xl shadow-emerald-600/20 scale-105 z-10' 
                  : 'bg-[#fafafa] border-zinc-100 hover:border-emerald-100 hover:bg-white'}
              `}
            >
              {plan.highlight && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  แนะนำสำหรับคุณ
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</h3>
                <p className={`text-sm font-medium ${plan.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className={`text-5xl font-black tracking-tighter ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>
                  {plan.price === "Custom" ? "" : "฿"}{plan.price}
                </span>
                {plan.price !== "Custom" && plan.price !== "0" && (
                  <span className={`text-sm font-bold ${plan.highlight ? 'text-zinc-500' : 'text-zinc-400'}`}>/เดือน</span>
                )}
                {plan.price === "Custom" && (
                  <span className={`text-4xl font-black tracking-tighter ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>ติดต่อเรา</span>
                )}
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Check className={`w-4 h-4 ${plan.highlight ? 'text-emerald-500' : 'text-emerald-600'}`} />
                    <span className={`text-sm font-medium ${plan.highlight ? 'text-zinc-300' : 'text-zinc-600'}`}>{f}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/verify"
                className={`
                  w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95
                  ${plan.highlight 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20' 
                    : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'}
                `}
              >
                {plan.button}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
