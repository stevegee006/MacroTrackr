'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

export function BottomNav() {
  const pathname = usePathname();
  const centerIndex = Math.floor(navItems.length / 2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md pb-safe dark:bg-gray-900/90 lg:hidden">
      {/* Top border with notch for center button */}
      <svg className="absolute top-0 left-0 w-full h-[1px] overflow-visible" preserveAspectRatio="none">
        <defs>
          <clipPath id="nav-notch">
            <rect x="0" y="0" width="100%" height="20" />
            <circle cx="50%" cy="-8" r="32" />
          </clipPath>
        </defs>
        <line x1="0" y1="0" x2="100%" y2="0" className="stroke-gray-200/80 dark:stroke-gray-700/60" strokeWidth="1" clipPath="url(#nav-notch)" />
      </svg>
      <div className="flex items-end justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }, index) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const isCenter = index === centerIndex;

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 pb-2 -mt-4"
              >
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95',
                  isActive
                    ? 'bg-emerald-600 shadow-emerald-500/30'
                    : 'bg-emerald-500 shadow-emerald-500/20'
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className={cn(
                  'text-[10px]',
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                )}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2 min-h-[48px] pt-2 text-[10px] transition-all',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-500" />
              )}
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
