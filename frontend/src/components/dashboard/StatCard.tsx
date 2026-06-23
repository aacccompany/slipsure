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
    <div
      className="bg-white p-5 transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-4 h-4" style={{ color: 'var(--blue)' }} />
        {change && (
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: isPositive ? 'var(--blue)' : '#EF4444' }}
          >
            {change}
          </span>
        )}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <h3
        className="font-bold tracking-tight"
        style={{ fontSize: '1.6rem', color: 'var(--navy)', lineHeight: 1, letterSpacing: '-0.02em' }}
      >
        {value}
      </h3>
    </div>
  );
};
