'use client';

import React, { useState } from 'react';
import {
  Users, ShieldAlert, Settings, Search,
  Activity, DollarSign, Zap, Image as ImageIcon,
  LogOut, TrendingUp, Bell, ChevronRight, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminLogout } from './login/actions';

const navItems = [
  { label: 'Overview',  icon: Activity,    active: true },
  { label: 'Merchants', icon: Users },
  { label: 'Revenue',   icon: DollarSign },
  { label: 'Security',  icon: ShieldAlert },
  { label: 'Settings',  icon: Settings },
];

const merchants = [
  { id: 'M-001', name: 'Premium Coffee Shop', plan: 'Pro',        status: 'active',    usage: 85,  joined: '12 Jan 2026' },
  { id: 'M-002', name: 'Global Tech Store',   plan: 'Enterprise', status: 'active',    usage: 42,  joined: '05 Feb 2026' },
  { id: 'M-003', name: 'Local Bakery',        plan: 'Free',       status: 'suspended', usage: 100, joined: '20 Mar 2026' },
  { id: 'M-004', name: 'Fashion Hub',         plan: 'Pro',        status: 'active',    usage: 12,  joined: '01 Apr 2026' },
  { id: 'M-005', name: 'Street Food King',    plan: 'Starter',    status: 'active',    usage: 67,  joined: '14 Apr 2026' },
];

const planColor: Record<string, string> = {
  Enterprise: 'bg-zinc-900 text-white border-zinc-900',
  Pro:        'bg-blue-50 text-blue-800 border-blue-100',
  Starter:    'bg-emerald-50 text-emerald-700 border-emerald-100',
  Free:       'bg-zinc-50 text-zinc-500 border-zinc-200',
};

export default function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={cn(
        'w-60 bg-white border-r border-zinc-200 flex flex-col h-screen',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        'md:static md:translate-x-0 md:z-auto md:shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>

        {/* Brand */}
        <div className="h-14 flex items-center justify-between gap-2.5 px-5 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-900 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-mono text-[13px] font-bold text-zinc-900 tracking-tight">
              FLOWSLIP <span className="text-blue-800">ADMIN</span>
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left',
                active
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-zinc-100">
          <form action={adminLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 bg-white border-b border-zinc-200 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="font-medium text-zinc-900">Overview</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Platform Command</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              All systems operational
            </div>
            <button className="relative p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Page title */}
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Command</h1>
            <p className="text-sm text-zinc-500 mt-0.5">System status and merchant management.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total MRR',    value: '฿124,500', icon: DollarSign, trend: '+12%',  up: true  },
              { label: 'Active Shops', value: '482',       icon: Users,       trend: '+5',    up: true  },
              { label: 'Daily Scans',  value: '45.2k',     icon: Activity,    trend: '+8%',   up: true  },
              { label: 'Success Rate', value: '99.8%',     icon: TrendingUp,  trend: 'Stable', up: true },
            ].map(({ label, value, icon: Icon, trend, up }) => (
              <div key={label} className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <span className={cn(
                    'text-[11px] font-semibold',
                    up ? 'text-emerald-600' : 'text-zinc-400',
                  )}>
                    {trend}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Merchant table */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Merchant Registry</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{merchants.length} merchants total</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search merchants…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors w-56"
                />
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  {['Merchant', 'Plan', 'Usage', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-blue-800 transition-colors">{m.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{m.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded',
                        planColor[m.plan] ?? planColor.Free,
                      )}>
                        {m.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              m.usage >= 90 ? 'bg-red-500' : m.usage >= 70 ? 'bg-amber-400' : 'bg-emerald-500',
                            )}
                            style={{ width: `${m.usage}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{m.usage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium',
                        m.status === 'active' ? 'text-emerald-700' : 'text-red-600',
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          m.status === 'active' ? 'bg-emerald-500' : 'bg-red-500',
                        )} />
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400">{m.joined}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {m.status === 'active' ? (
                          <button className="text-[11px] font-medium px-2.5 py-1 rounded border border-red-100 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-colors">
                            Suspend
                          </button>
                        ) : (
                          <button className="text-[11px] font-medium px-2.5 py-1 rounded border border-blue-100 text-blue-700 bg-blue-50 hover:bg-blue-700 hover:text-white transition-colors">
                            Activate
                          </button>
                        )}
                        <button className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment approvals */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Payment Approvals</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manual slip payments pending review</p>
              </div>
              <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">
                3 Pending
              </span>
            </div>

            <div className="divide-y divide-zinc-50">
              {[
                { shop: 'Local Bakery',    amount: '฿990.00',   time: '10m ago', ref: 'SLIP-9021' },
                { shop: 'Premium Coffee',  amount: '฿4,900.00', time: '2h ago',  ref: 'SLIP-8812' },
                { shop: 'Street Food King',amount: '฿1,990.00', time: '5h ago',  ref: 'SLIP-7703' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{p.shop}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.ref} · {p.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-zinc-900">{p.amount}</span>
                    <div className="flex items-center gap-2">
                      <button className="text-[11px] font-medium px-3 py-1.5 bg-blue-800 text-white rounded hover:bg-blue-900 transition-colors">
                        Approve
                      </button>
                      <button className="text-[11px] font-medium px-3 py-1.5 border border-zinc-200 text-zinc-500 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors">
                        Reject
                      </button>
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
