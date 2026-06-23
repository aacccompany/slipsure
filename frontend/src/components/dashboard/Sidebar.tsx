'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, User, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const menuItems = [
  { name: 'ภาพรวม',   href: '/dashboard',          icon: LayoutDashboard, exact: true },
  { name: 'ร้านค้า',  href: '/dashboard/merchant',  icon: Store },
  { name: 'บัญชี',    href: '/dashboard/account',   icon: User },
  { name: 'API Docs', href: '/dashboard/docs',       icon: BookOpen },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = async () => {
    localStorage.removeItem('isLoggedIn');
    await logout();
  };

  return (
    <aside className={[
      'w-52 flex flex-col h-screen',
      'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
      'md:sticky md:top-0 md:translate-x-0 md:z-auto',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    ].join(' ')}
    style={{ background: '#fff', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" onClick={onClose}>
          <Image src="/logo.png" alt="Flowslip" width={96} height={26} className="h-6 w-auto" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all"
              style={{
                color: isActive ? 'var(--navy)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                borderLeft: `2px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)', borderLeft: '2px solid transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
};
