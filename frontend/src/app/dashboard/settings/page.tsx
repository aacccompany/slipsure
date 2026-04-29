'use client';

import React from 'react';
import { 
  User, 
  Building2, 
  Mail, 
  Shield, 
  Bell, 
  CreditCard,
  Save,
  Camera
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Settings</h1>
        <p className="text-sm font-medium text-zinc-500">Manage your account preferences and business information.</p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
           <div className="flex items-center gap-6 mb-10">
              <div className="relative group">
                 <div className="w-24 h-24 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-black border-4 border-white shadow-lg">
                    KB
                 </div>
                 <button className="absolute -bottom-2 -right-2 p-2 bg-zinc-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                 </button>
              </div>
              <div>
                 <h3 className="text-xl font-bold text-zinc-900 mb-1">Keerati B.</h3>
                 <p className="text-sm font-medium text-zinc-500">keerati@slipsure.ai</p>
              </div>
           </div>

           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Full Name</label>
                 <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        defaultValue="Keerati B."
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Email Address</label>
                 <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="email" 
                        defaultValue="keerati@slipsure.ai"
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                 </div>
              </div>
           </div>
        </section>

        {/* Business Section */}
        <section className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
           <h3 className="text-sm font-bold text-zinc-900 mb-8 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Business Information
           </h3>
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Company Name</label>
                 <input 
                    type="text" 
                    placeholder="Slipsure Co., Ltd."
                    className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Tax ID (Optional)</label>
                 <input 
                    type="text" 
                    placeholder="0123456789012"
                    className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                 />
              </div>
           </div>
        </section>

        <div className="flex items-center justify-end gap-4">
            <button className="px-8 py-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                Discard Changes
            </button>
            <button className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
}
