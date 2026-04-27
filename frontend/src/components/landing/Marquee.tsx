'use client';

import React from 'react';

const banks = ['KBANK', 'SCB', 'UOB', 'BBL', 'BAY', 'KTB', 'TTB', 'GSB'];

export const Marquee = () => {
  return (
    <section className="py-10 bg-white overflow-hidden border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-6 mb-8 text-center">
         <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Supported Banks & Connectivity</p>
      </div>
      <div className="flex whitespace-nowrap overflow-hidden">
        <div className="flex animate-marquee gap-16 items-center min-w-full justify-around opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
          {banks.map((bank) => (
            <span key={bank} className="text-sm font-black text-zinc-400 tracking-widest uppercase">
              {bank}
            </span>
          ))}
          {/* Duplicate */}
          {banks.map((bank) => (
            <span key={`${bank}-2`} className="text-sm font-black text-zinc-400 tracking-widest uppercase">
              {bank}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  );
};
