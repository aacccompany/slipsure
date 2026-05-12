'use client';

import React from 'react';
import { 
  Users, 
  ShieldAlert, 
  Settings, 
  Search, 
  MoreVertical,
  Activity,
  DollarSign,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const mockMerchants = [
  { id: 'M-001', name: 'Premium Coffee Shop', plan: 'Pro', status: 'active', usage: '85%', joined: '2026-01-12' },
  { id: 'M-002', name: 'Global Tech Store', plan: 'Enterprise', status: 'active', usage: '42%', joined: '2026-02-05' },
  { id: 'M-003', name: 'Local Bakery', plan: 'Free', status: 'suspended', usage: '100%', joined: '2026-03-20' },
  { id: 'M-004', name: 'Fashion Hub', plan: 'Pro', status: 'active', usage: '12%', joined: '2026-04-01' },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <div className="flex">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 h-screen sticky top-0 p-6 flex flex-col gap-8">
          <div className="flex items-center gap-2 font-bold px-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl">Admin<span className="text-emerald-600">.Ops</span></span>
          </div>
          <nav className="flex-1 space-y-1">
            {[
              { label: 'Overview', icon: Activity, active: true },
              { label: 'Merchants', icon: Users },
              { label: 'Revenue', icon: DollarSign },
              { label: 'Security', icon: ShieldAlert },
              { label: 'Settings', icon: Settings },
            ].map((item) => (
              <div 
                key={item.label}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm",
                  item.active ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-10 space-y-10">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Platform Command</h1>
              <p className="text-zinc-500 text-sm mt-1 font-medium">System status and merchant management.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-zinc-200 rounded-full shadow-sm">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Global Status: Healthy</span>
            </div>
          </header>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total MRR', value: '฿124,500', icon: DollarSign, trend: '+12%' },
              { label: 'Active Shops', value: '482', icon: Users, trend: '+5' },
              { label: 'Daily Scans', value: '45.2k', icon: Activity, trend: '+8%' },
              { label: 'Success Rate', value: '99.8%', icon: ShieldAlert, trend: 'Stable' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <stat.icon className="w-5 h-5 text-zinc-600" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{stat.trend}</span>
                </div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-zinc-900">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Merchant Management Table */}
          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Merchant Registry</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Search shops..." 
                    className="pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50/50 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  <th className="px-8 py-4">Shop Identity</th>
                  <th className="px-8 py-4">Subscription</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {mockMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{merchant.name}</span>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">{merchant.id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        merchant.plan === 'Enterprise' ? "border-zinc-900 bg-zinc-900 text-white" :
                        merchant.plan === 'Pro' ? "border-emerald-100 bg-emerald-50 text-emerald-600" :
                        "border-zinc-100 bg-zinc-50 text-zinc-500"
                      )}>
                        {merchant.plan}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          merchant.status === 'active' ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        <span className="text-xs font-bold uppercase text-zinc-600">{merchant.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      {merchant.status === 'active' ? (
                        <button className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-600 hover:text-white transition-all">
                          Suspend
                        </button>
                      ) : (
                        <button className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-600 hover:text-white transition-all">
                          Activate
                        </button>
                      )}
                      <button className="p-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Ops Section */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                   </div>
                   <div>
                      <h2 className="text-lg font-bold text-zinc-900">Payment Approvals</h2>
                      <p className="text-xs text-zinc-500 font-medium">Verify manual slip payments for Pro/Enterprise plans.</p>
                   </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">3 Pending</span>
             </div>
             
             <div className="space-y-4">
                {[
                  { shop: 'Local Bakery', amount: '฿990.00', date: '10m ago', ref: 'SLIP-9021' },
                  { shop: 'Premium Coffee', amount: '฿4,900.00', date: '2h ago', ref: 'SLIP-8812' },
                ].map((pay, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl group hover:border-emerald-200 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-zinc-200 rounded-lg flex items-center justify-center">
                           <ImageIcon className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-zinc-900">{pay.shop}</p>
                           <p className="text-[10px] text-zinc-400 font-bold uppercase">{pay.ref} // {pay.date}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <span className="text-sm font-black text-zinc-900">{pay.amount}</span>
                        <div className="flex items-center gap-2">
                           <button className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-emerald-700 transition-all">Approve</button>
                           <button className="px-4 py-2 bg-white border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all">Reject</button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}
