'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X, Cpu } from 'lucide-react';
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
    <nav className="fixed top-0 z-[100] w-full border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Logo Section - Crafted Detail */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
          <div className="relative">
            <ShieldCheck className="w-8 h-8 text-[#7C3AED] relative z-10" />
            <div className="absolute inset-0 bg-[#7C3AED]/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tighter text-zinc-900 uppercase">SLIPSURE</span>
            <span className="text-[9px] font-mono font-bold text-zinc-400 tracking-widest mt-0.5">CORE_ENGINE_V2</span>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-12">
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
                  pathname === link.href ? "text-[#7C3AED]" : "text-zinc-400 hover:text-zinc-900 hover:tracking-[0.25em]"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="h-4 w-px bg-zinc-200"></div>
          
          <Link href="/verify" className="bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-full hover:bg-[#7C3AED] transition-all shadow-xl shadow-zinc-900/10 active:scale-95">
            Verify Now
          </Link>
        </div>

        <button className="md:hidden p-2 text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-zinc-100 py-10 px-6 animate-fade-in">
          <div className="flex flex-col gap-10">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="text-3xl font-black tracking-tighter uppercase text-zinc-900">
                {link.name}
              </Link>
            ))}
            <Link href="/verify" onClick={() => setIsOpen(false)} className="w-full bg-[#7C3AED] text-white text-center font-black py-5 rounded-2xl shadow-xl text-lg uppercase tracking-widest">
              Verify Slip
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
