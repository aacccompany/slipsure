import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  isPositive, 
  icon: Icon,
  trend 
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100">
          <Icon className="w-6 h-6 text-zinc-900" />
        </div>
        {change && (
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {isPositive ? '+' : ''}{change}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};
