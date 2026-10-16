'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fades elements marked `data-reveal` up into place the first time they scroll into view.
 * `data-reveal="2"` staggers the entrance by 2 × 80ms.
 *
 * Elements already on screen are never hidden, and nothing is hidden until this effect runs,
 * so the page stays readable without JS or with reduced motion.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.rv = 'in';
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );

    for (const el of els) {
      const step = Number(el.dataset.reveal) || 0;
      if (step) el.style.setProperty('--rd', `${step * 0.08}s`);
      // already visible (or scrolled past on load): leave it alone
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      el.dataset.rv = 'armed';
      io.observe(el);
    }

    return () => {
      io.disconnect();
      for (const el of els) delete el.dataset.rv;
    };
  }, [pathname]);

  return null;
}
