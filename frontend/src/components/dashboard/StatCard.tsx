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
      className="bg-white p-5"
      style={{ border: '1px solid var(--border)' }}
    >
      <div
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: isPositive === false ? '#FEF2F2' : 'var(--blue-pale)' }}
      >
        <Icon className="h-4 w-4" style={{ color: isPositive === false ? '#EF4444' : 'var(--blue)' }} />
      </div>
      <p className="mb-1 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <h3
        className="font-extrabold tracking-tight"
        style={{ fontSize: '1.75rem', color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
      >
        {value}
      </h3>
      {change && (
        <p
          className="mt-2 text-xs font-medium"
          style={{ color: isPositive === false ? '#EF4444' : 'var(--text-muted)' }}
        >
          {change}
        </p>
      )}
    </div>
  );
};
