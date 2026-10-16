'use client';

import React from 'react';

const banks = [
  { name: 'KASIKORNBANK', dot: '#138F2D' },
  { name: 'SCB', dot: '#4E2A84' },
  { name: 'KRUNGTHAI', dot: '#00A4E4' },
  { name: 'BANGKOK BANK', dot: '#1E4598' },
  { name: 'TTB', dot: '#F26B21' },
  { name: 'GSB', dot: '#EB198D' },
  { name: 'UOB', dot: '#0B3979' },
  { name: 'CIMB', dot: '#7E2F36' },
  { name: 'BAY', dot: '#FEC43B' },
];

export const Marquee = () => {
  return (
    <div className="relative overflow-hidden py-6" style={{ background: 'var(--bg)' }}>
      {/* 6 copies, translated by 50% (= 3 whole copies) for a seamless loop.
          Two copies ran out on wide / scaled-up screens and left a gap. */}
      <div className="flex animate-marquee whitespace-nowrap" style={{ animationDuration: '60s' }}>
        {Array.from({ length: 6 }, () => banks).flat().map((bank, i) => (
          <span
            key={i}
            className="mx-2 inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold tracking-wide"
            style={{ color: 'var(--navy)', boxShadow: '0 0 0 1px rgba(0,24,71,0.07)' }}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: bank.dot }} />
            {bank.name}
          </span>
        ))}
      </div>

      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20"
        style={{ background: 'linear-gradient(to right, var(--bg), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20"
        style={{ background: 'linear-gradient(to left, var(--bg), transparent)' }}
      />
    </div>
  );
};
