'use client';

import React from 'react';

export const Marquee = () => {
  const items = [
    'KASIKORNBANK', 'SCB', 'BANGKOK BANK', 'KRUNGTHAI', 'TTB', 'GSB', 'UOB', 'CIMB',
  ];

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 overflow-hidden py-3">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-6 mx-8">
            <span className="font-mono text-[11px] text-zinc-400 tracking-[0.2em] uppercase">{item}</span>
            <span className="font-mono text-zinc-300 text-xs">/</span>
          </div>
        ))}
      </div>
    </div>
  );
};
