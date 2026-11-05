'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'flowslip-theme';

export function setTheme(next: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.add('theme-fade');
  root.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  window.setTimeout(() => root.classList.remove('theme-fade'), 350);
}

/** Sun/moon button. `variant="inline"` renders a labelled row for menus. */
export function ThemeToggle({
  variant = 'icon',
  className = '',
  onDark = false,
}: {
  variant?: 'icon' | 'inline';
  className?: string;
  /** sits on a permanently dark surface (sidebar): use light-on-dark colours */
  onDark?: boolean;
}) {
  const [theme, setThemeState] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    setThemeState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    const obs = new MutationObserver(() =>
      setThemeState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const isDark = theme === 'dark';
  const label = isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด';
  const Icon = isDark ? Sun : Moon;
  const colors = onDark
    ? { color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.08)' }
    : { color: 'var(--ink)', background: 'var(--bg-subtle)' };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={label}
        className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-base font-semibold ${className}`}
        style={colors}
        suppressHydrationWarning
      >
        <span>{theme === null ? 'ธีม' : isDark ? 'โหมดมืด' : 'โหมดสว่าง'}</span>
        {theme !== null && <Icon className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${className}`}
      style={colors}
    >
      {theme !== null && <Icon className="h-[18px] w-[18px]" />}
    </button>
  );
}
