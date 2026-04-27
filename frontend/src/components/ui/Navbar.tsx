'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'หน้าหลัก', href: '/' },
    { name: 'บริการ', href: '/services' },
    { name: 'ราคา', href: '/pricing' },
    { name: 'API Docs', href: '/docs' },
  ];

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Correct Domain Logo: QrCode */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
          <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center transition-all group-hover:bg-zinc-700 shadow-xl shadow-zinc-900/10">
            <QrCode className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter text-zinc-900 uppercase">SLIPSURE.Ai</span>
            <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-[0.2em] mt-1 uppercase">Verification</span>
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[12px] font-bold uppercase tracking-[0.15em] transition-all",
                  pathname === link.href ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-900"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <Link href="/verify" className="bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-md hover:bg-zinc-700 transition-all shadow-xl shadow-zinc-900/10 active:scale-95 border border-transparent">
            Get Started
          </Link>
        </div>

        <button className="md:hidden p-2 text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-zinc-100 py-10 px-6 animate-fade-in">
          <div className="flex flex-col gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="text-2xl font-black tracking-tighter uppercase text-zinc-900">
                {link.name}
              </Link>
            ))}
            <Link href="/verify" onClick={() => setIsOpen(false)} className="w-full bg-zinc-900 text-white text-center font-black py-5 rounded-xl shadow-xl text-lg uppercase tracking-widest">
              Verify Slip
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
