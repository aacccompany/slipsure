'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Menu, X } from 'lucide-react';
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
    <nav className="fixed top-0 z-[100] w-full border-b border-zinc-100 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="w-6 h-6 text-[#7C3AED]" />
          <span className="text-xl font-bold tracking-tight text-zinc-900 uppercase">SLIPSURE</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors",
                pathname === link.href ? "text-[#7C3AED]" : "text-zinc-400 hover:text-zinc-900"
              )}
            >
              {link.name}
            </Link>
          ))}
          <Link href="/verify" className="bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg hover:bg-black transition-all shadow-sm">
            ตรวจสอบสลิป
          </Link>
        </div>

        <button className="md:hidden text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-zinc-100 py-8 px-6 animate-fade-in">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="text-sm font-bold uppercase tracking-widest text-zinc-900">
                {link.name}
              </Link>
            ))}
            <Link href="/verify" onClick={() => setIsOpen(false)} className="w-full bg-zinc-900 text-white text-center font-bold py-3 rounded-lg shadow-sm">
              ตรวจสอบสลิป
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
