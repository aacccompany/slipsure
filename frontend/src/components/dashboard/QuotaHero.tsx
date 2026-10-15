import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarClock } from 'lucide-react';

interface QuotaHeroProps {
  limit: number;
  used: number;
  remaining: number;
  resetLabel: string;
  isBlocked?: boolean;
}

export const QuotaHero: React.FC<QuotaHeroProps> = ({ limit, used, remaining, resetLabel, isBlocked }) => {
  const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = isBlocked || percentUsed >= 100
    ? { ring: '#F43F5E', soft: '#FFF1F2', text: '#BE123C', note: 'โควต้าหมดแล้ว' }
    : percentUsed >= 80
      ? { ring: '#F59E0B', soft: '#FFFBEB', text: '#B45309', note: 'โควต้าใกล้หมด' }
      : { ring: 'var(--blue)', soft: 'var(--blue-pale)', text: 'var(--blue)', note: 'ใช้งานได้ตามปกติ' };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentUsed / 100) * circumference;

  return (
    <div
      className="relative flex flex-col gap-6 bg-white p-6 sm:flex-row sm:items-center"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`ใช้โควต้าแล้ว ${percentUsed}%`}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#EEF2F7" strokeWidth="12" />
          {percentUsed > 0 && (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={tone.ring}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold leading-none" style={{ color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            {percentUsed}%
          </span>
          <span className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>ใช้ไปแล้ว</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: tone.soft, color: tone.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.ring }} />
          {tone.note}
        </span>

        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>โควต้าสลิปที่เหลือเดือนนี้</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className="text-5xl font-extrabold leading-tight" style={{ color: 'var(--navy)', letterSpacing: '-0.03em' }}>
            {remaining.toLocaleString()}
          </span>
          <span className="text-base" style={{ color: 'var(--text-muted)' }}>
            จาก {limit.toLocaleString()} สลิป
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            รีเซ็ตโควต้า {resetLabel}
          </span>
          <span>ใช้ไปแล้ว {used.toLocaleString()} สลิป</span>
        </div>
      </div>

      <Link
        href="/dashboard/subscription"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 sm:self-start"
        style={{ background: 'var(--blue)' }}
      >
        อัพเกรดแผน
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
};
