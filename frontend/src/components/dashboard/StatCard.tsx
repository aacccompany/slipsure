import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive, icon: Icon }) => {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-4 h-4 text-zinc-400" />
        {change && (
          <span className={`font-mono text-[10px] uppercase tracking-widest ${isPositive ? 'text-blue-700' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{change}
          </span>
        )}
      </div>
      <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
    </div>
  );
};
