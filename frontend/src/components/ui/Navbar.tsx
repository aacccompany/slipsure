'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'บริการ', href: '/services' },
    { name: 'ราคา', href: '/pricing' },
    { name: 'API Docs', href: '/docs' },
    { name: 'Login', href: '/login' },
  ];

  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
          <span className="font-mono text-sm font-bold text-zinc-900 tracking-tight">FLOWSLIP</span>
          <span className="font-mono text-[10px] text-zinc-400 border border-zinc-200 px-1.5 py-0.5">v1.0</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                pathname === link.href
                  ? "text-zinc-900 font-medium"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/verify"
            className="text-sm font-medium bg-blue-800 text-white hover:bg-blue-900 transition-colors px-5 py-2 rounded-full"
          >
            เริ่มใช้งาน →
          </Link>
        </div>

        <button className="md:hidden p-2 text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-white border-b border-zinc-200 py-6 px-6">
          <div className="flex flex-col gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm text-zinc-700 border-b border-zinc-100 pb-2"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/verify"
              onClick={() => setIsOpen(false)}
              className="bg-blue-800 text-white text-sm font-medium text-center py-3 rounded-xl hover:bg-blue-900 transition-colors"
            >
              เริ่มใช้งาน →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
