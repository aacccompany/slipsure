'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/dashboard')) return null;
  if (pathname?.startsWith('/admin')) return null;

  const navLinks = [
    { name: 'บริการ', href: '/services' },
    { name: 'ราคา', href: '/pricing' },
    { name: 'Login', href: '/login' },
  ];

  return (
    <nav className="fixed inset-x-0 top-3 z-[100] px-3">
      <div
        className="relative mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full pl-6 pr-2 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(14px)',
          boxShadow: scrolled
            ? '0 10px 30px -12px rgba(0,24,71,0.25), 0 0 0 1px rgba(0,24,71,0.06)'
            : '0 0 0 1px rgba(0,24,71,0.06)',
        }}
      >
        <Link href="/" className="flex items-center" onClick={() => setIsOpen(false)}>
          <Image src="/logo.png" alt="Flowslip" width={100} height={28} className="h-6 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
                style={{
                  color: active ? 'var(--navy)' : 'var(--text-muted)',
                  background: active ? 'var(--bg-subtle)' : undefined,
                }}
              >
                {link.name}
              </Link>
            );
          })}

          <Link
            href="/register"
            className="group ml-2 inline-flex items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5 text-sm font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: 'var(--navy)' }}
          >
            เริ่มใช้งาน
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:rotate-45"
              style={{ background: 'var(--cyan)', color: 'var(--navy)' }}
            >
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <button
          className="mr-1 flex h-10 w-10 items-center justify-center rounded-full md:hidden"
          style={{ color: 'var(--navy)', background: 'var(--bg-subtle)' }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="pop-in mx-auto mt-2 max-w-5xl rounded-[2rem] bg-white p-3 md:hidden"
          style={{ boxShadow: '0 20px 40px -16px rgba(0,24,71,0.3), 0 0 0 1px rgba(0,24,71,0.06)' }}
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-full px-5 py-3 text-base font-semibold"
                style={{
                  color: 'var(--navy)',
                  background: pathname === link.href ? 'var(--bg-subtle)' : undefined,
                }}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-full py-3.5 text-center text-base font-bold text-white"
              style={{ background: 'var(--navy)' }}
            >
              เริ่มใช้งานฟรี →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
