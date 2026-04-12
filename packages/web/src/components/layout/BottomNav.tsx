'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

export function BottomNav() {
  const pathname = usePathname();
  const centerIndex = Math.floor(navItems.length / 2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* SVG curved notch border */}
      <svg
        className="absolute top-0 left-0 w-full"
        viewBox="0 0 400 56"
        preserveAspectRatio="none"
        style={{ height: '56px', transform: 'translateY(-27px)' }}
      >
        <path
          d="M0,28 H155 C162,28 168,20 172,12 C178,2 186,-4 200,-4 C214,-4 222,2 228,12 C232,20 238,28 245,28 H400 V56 H0 Z"
          className="fill-white/90 dark:fill-gray-900/90"
          style={{ filter: 'url(#blur)' }}
        />
        <path
          d="M0,28 H155 C162,28 168,20 172,12 C178,2 186,-4 200,-4 C214,-4 222,2 228,12 C232,20 238,28 245,28 H400"
          fill="none"
          className="stroke-gray-200/80 dark:stroke-gray-700/60"
          strokeWidth="0.5"
        />
      </svg>

      {/* Nav background (below notch) */}
      <div className="relative bg-white/90 backdrop-blur-md dark:bg-gray-900/90 pb-safe">
        <div className="flex items-start justify-around px-2 pt-1">
          {navItems.map(({ href, label, icon: Icon }, index) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            const isCenter = index === centerIndex;

            if (isCenter) {
              return (
                <div key={href} className="flex flex-col items-center" style={{ marginTop: '-32px' }}>
                  <Link
                    href={href}
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 mb-0.5',
                      isActive
                        ? 'bg-emerald-600 shadow-emerald-500/30'
                        : 'bg-emerald-500 shadow-emerald-500/20'
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </Link>
                  <span className={cn(
                    'text-[10px]',
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {label}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-all',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-500" />
                )}
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
