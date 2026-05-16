'use client';

import React from 'react';
import { Check, Crown, Zap, Shield, ArrowRight, CreditCard, Clock, History } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    credits: '10',
    description: 'Perfect for testing and personal side projects.',
    features: ['10 Verifications / Month', 'Standard API Speed', 'Email Support', 'Basic Dashboard'],
    isCurrent: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '990',
    credits: '1,000',
    description: 'Ideal for growing merchants and automated shops.',
    features: ['1,000 Verifications / Month', 'High Priority API', 'Webhook Notifications', 'Priority Support', 'Full Logs History'],
    isCurrent: false,
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '4,900',
    credits: '10,000',
    description: 'Built for high-volume enterprises and platforms.',
    features: ['10,000 Verifications / Month', 'Ultra-Low Latency', 'Unlimited Webhooks', 'Dedicated Support', 'Custom Integration'],
    isCurrent: false,
  }
];

export default function SubscriptionPage() {
  const handleUpgrade = (planName: string) => {
    toast.info(`Checkout for ${planName} plan is not yet available in demo.`);
  };

  return (
    <div className="p-8 space-y-10 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Subscription</h1>
          <p className="text-sm font-medium text-zinc-500">Manage your plan, billing, and credit usage.</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 border border-blue-50 rounded-xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-800 fill-blue-500" />
            <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">Free Plan Active</span>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                    <Zap className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monthly Credits</p>
                    <h3 className="text-lg font-bold text-zinc-900">12 / 50</h3>
                </div>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className="w-[24%] h-full bg-blue-800 rounded-full" />
            </div>
        </div>
        
        <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                    <Clock className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reset Date</p>
                    <h3 className="text-lg font-bold text-zinc-900">May 24, 2026</h3>
                </div>
            </div>
            <p className="text-xs font-medium text-zinc-500">In 14 days</p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                    <CreditCard className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Payment Method</p>
                    <h3 className="text-lg font-bold text-zinc-900">None Linked</h3>
                </div>
            </div>
            <button className="text-xs font-bold text-blue-800 hover:underline">Add Method</button>
        </div>
      </div>

      {/* Plans Selection */}
      <div className="grid lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`
                relative p-10 rounded-[2.5rem] border transition-all duration-300 flex flex-col
                ${plan.highlight 
                  ? 'bg-zinc-900 border-zinc-800 shadow-2xl shadow-blue-500/10 scale-105 z-10' 
                  : 'bg-white border-zinc-100 hover:border-blue-50'}
            `}
          >
            {plan.isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-zinc-100 border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Your Current Plan
                </div>
            )}
            
            <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</h3>
                <p className={`text-sm font-medium ${plan.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{plan.description}</p>
            </div>

            <div className="mb-10 flex items-baseline gap-1">
                <span className={`text-5xl font-black tracking-tighter ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>
                   ฿{plan.price}
                </span>
                <span className={`text-sm font-bold ${plan.highlight ? 'text-zinc-500' : 'text-zinc-400'}`}>/month</span>
            </div>

            <div className="space-y-4 mb-12 flex-1">
                {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Check className={`w-4 h-4 ${plan.highlight ? 'text-blue-500' : 'text-blue-800'}`} />
                        <span className={`text-sm font-medium ${plan.highlight ? 'text-zinc-300' : 'text-zinc-600'}`}>{feature}</span>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => handleUpgrade(plan.name)}
                disabled={plan.isCurrent}
                className={`
                    w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${plan.isCurrent 
                      ? 'bg-zinc-50 text-zinc-400 cursor-not-allowed' 
                      : plan.highlight 
                        ? 'bg-blue-800 text-white hover:bg-blue-900 shadow-lg shadow-blue-500/20' 
                        : 'bg-zinc-900 text-white hover:bg-black'}
                `}
            >
                {plan.isCurrent ? 'Current Plan' : 'Select Plan'}
                {!plan.isCurrent && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      {/* Billing History Placeholder */}
      <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm">
         <h3 className="text-xl font-bold text-zinc-900 mb-8 flex items-center gap-3">
            <History className="w-5 h-5 text-blue-700" />
            Billing History
         </h3>
         <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-3xl">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-zinc-300" />
            </div>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No invoices found yet</p>
         </div>
      </div>
    </div>
  );
}
