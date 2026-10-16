import React from 'react';

/** A single shimmering placeholder block. Size / shape come from className. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`skeleton ${className}`} style={style} />;
}

function Busy({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="กำลังโหลด" className={className}>
      {children}
    </div>
  );
}

const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3'];

/** Placeholder rows for list/table bodies (slips, orders, dashboard table). */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Busy>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-t px-6 py-5" style={{ borderColor: 'var(--border)' }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${WIDTHS[(r + c) % WIDTHS.length]}`} />
          ))}
        </div>
      ))}
    </Busy>
  );
}

/** Compact slip list (dashboard "recent slips" card). */
export function SlipListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </Busy>
  );
}

/** Whole merchant-dashboard overview: header, quota hero, stat cards, chart, table. */
export function DashboardSkeleton() {
  return (
    <Busy className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-[1.75rem]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-[1.75rem] xl:col-span-2" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
      </div>
      <div className="overflow-hidden rounded-[1.75rem] bg-white">
        <TableSkeleton rows={4} cols={5} />
      </div>
    </Busy>
  );
}

/** Pricing: slider card + plan cards. */
export function PricingSkeleton() {
  return (
    <Busy className="pb-8">
      <Skeleton className="mx-auto mb-12 h-44 max-w-3xl rounded-[2.25rem]" />
      <Skeleton className="mx-auto mb-8 h-24 max-w-3xl rounded-[2rem]" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[26rem] rounded-[2.25rem]" />
        ))}
      </div>
    </Busy>
  );
}

/** Generic sub-page: heading, a row of cards, one large panel. */
export function PageSkeleton() {
  return (
    <Busy className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-[1.75rem]" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-[1.75rem]" />
    </Busy>
  );
}

/** A few text lines: detail panels, status widgets. */
export function LinesSkeleton({ lines = 4, className = 'p-6' }: { lines?: number; className?: string }) {
  return (
    <Busy className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${WIDTHS[i % WIDTHS.length]}`} />
      ))}
    </Busy>
  );
}

/** Admin analytics: stat cards + two charts. */
export function AnalyticsSkeleton() {
  return (
    <Busy className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-[1.5rem]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-56 rounded-[1.5rem]" />
        <Skeleton className="h-56 rounded-[1.5rem]" />
      </div>
    </Busy>
  );
}
