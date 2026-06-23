'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/dashboard')) return null;
  if (pathname?.startsWith('/admin')) return null;

  const navLinks = [
    { name: 'บริการ',  href: '/services' },
    { name: 'ราคา',   href: '/pricing'  },
    { name: 'Login',  href: '/login'    },
  ];

  return (
    <nav
      className="fixed top-0 z-[100] w-full transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250,250,246,0.95)' : '#FAFAF6',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? '#E5DFC8' : '#E5DFC8'}`,
      }}
    >
      {/* Gold top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--gold)' }} />

      <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
          <Image src="/logo.png" alt="Flowslip" width={100} height={28} className="h-6 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{
                color: pathname === link.href ? 'var(--navy)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = pathname === link.href ? 'var(--navy)' : 'var(--text-muted)')}
            >
              {link.name}
            </Link>
          ))}

          <Link
            href="/register"
            className="text-sm font-semibold px-5 py-2 transition-all hover:opacity-90"
            style={{
              background: 'var(--navy)',
              color: 'var(--gold-pale)',
              borderRadius: '2px',
            }}
          >
            เริ่มใช้งาน <span style={{ color: 'var(--gold)' }}>→</span>
          </Link>
        </div>

        <button
          className="md:hidden p-2 transition-colors"
          style={{ color: 'var(--navy)' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="md:hidden absolute top-14 left-0 w-full py-6 px-6"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex flex-col gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm pb-3"
                style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-center py-3 transition-all"
              style={{ background: 'var(--navy)', color: 'var(--gold-pale)', borderRadius: '2px' }}
            >
              เริ่มใช้งาน →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
