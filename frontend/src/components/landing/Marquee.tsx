'use client';

import React from 'react';

export const Marquee = () => {
  const banks = ['KASIKORNBANK', 'SCB', 'KRUNGTHAI', 'BANGKOK BANK', 'TTB', 'GSB', 'UOB', 'CIMB', 'BAY'];

  return (
    <div
      className="relative overflow-hidden py-4"
      style={{ background: 'var(--navy)', borderTop: '1px solid rgba(0,82,255,0.2)', borderBottom: '1px solid rgba(0,82,255,0.2)' }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {[...banks, ...banks].map((bank, i) => (
          <div key={i} className="flex items-center mx-8 gap-6">
            <span
              className="font-mono text-[10px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(248,250,252,0.4)' }}
            >
              {bank}
            </span>
            <span style={{ color: 'var(--blue)', fontSize: 7, opacity: 0.5 }}>◆</span>
          </div>
        ))}
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--navy), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--navy), transparent)' }} />
    </div>
  );
};
