'use client';

import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export const DashboardHeader = () => {
  return (
    <header className="h-20 border-b border-zinc-100 bg-white/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search logs, keys..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
        </button>
        
        <div className="h-10 w-px bg-zinc-100 mx-2" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right">
            <p className="text-sm font-bold text-zinc-900 leading-none mb-1">Keerati B.</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Developer Plan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
            KB
          </div>
        </div>
      </div>
    </header>
  );
};
