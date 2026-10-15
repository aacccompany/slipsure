import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, compact }) => (
  <div
    className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'py-8' : 'py-14'}`}
  >
    <div
      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      style={{ background: 'var(--blue-pale)' }}
    >
      <Icon className="h-6 w-6" style={{ color: 'var(--blue)' }} />
    </div>
    <p className="text-base font-bold" style={{ color: 'var(--navy)' }}>{title}</p>
    <p className="mt-1 max-w-xs text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
    {action && (
      <Link
        href={action.href}
        className="mt-5 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'var(--blue)' }}
      >
        {action.label}
      </Link>
    )}
  </div>
);
