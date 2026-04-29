'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Menu, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'หน้าหลัก', href: '/' },
    { name: 'บริการ', href: '/services' },
    { name: 'ราคา', href: '/pricing' },
    { name: 'API Docs', href: '/docs' },
    { name: 'Login', href: '/login' },
  ];

  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Logo แบบ EasySlip: สะอาดตา */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center transition-all group-hover:bg-emerald-500 shadow-lg shadow-emerald-600/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            Slipsure<span className="text-emerald-600">.ai</span>
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-all",
                  pathname === link.href ? "text-emerald-600" : "text-zinc-500 hover:text-emerald-600"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <Link 
            href="/verify" 
            className="group inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            เริ่มใช้งานฟรี
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button className="md:hidden p-2 text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-zinc-100 py-8 px-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="text-lg font-semibold text-zinc-900 border-b border-zinc-50 pb-2">
                {link.name}
              </Link>
            ))}
            <Link href="/verify" onClick={() => setIsOpen(false)} className="w-full bg-emerald-600 text-white text-center font-bold py-4 rounded-2xl shadow-lg">
              ลองตรวจสอบสลิป
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
