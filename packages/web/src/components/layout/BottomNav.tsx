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
      {/* Background with notch cutout */}
      <div className="relative">
        {/* Notch shape — circle cutout in the top border area */}
        <div className="absolute inset-x-0 top-0 h-[1px] overflow-visible">
          {/* Left border line */}
          <div className="absolute top-0 left-0 right-[calc(50%+34px)] h-[1px] bg-gray-200/80 dark:bg-gray-700/60" />
          {/* Right border line */}
          <div className="absolute top-0 left-[calc(50%+34px)] right-0 h-[1px] bg-gray-200/80 dark:bg-gray-700/60" />
          {/* Curved notch border */}
          <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[68px] h-[34px] -translate-y-[33px]" viewBox="0 0 68 34" fill="none">
            <path
              d="M0,34 C0,34 4,34 10,34 C16,34 20,28 24,20 C28,12 30,4 34,4 C38,4 40,12 44,20 C48,28 52,34 58,34 C64,34 68,34 68,34"
              className="stroke-gray-200/80 dark:stroke-gray-700/60"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* Nav content area */}
        <div className="bg-white/90 backdrop-blur-md dark:bg-gray-900/90 pb-safe pt-2">
          <div className="flex items-start justify-around px-2">
            {navItems.map(({ href, label, icon: Icon }, index) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              const isCenter = index === centerIndex;

              if (isCenter) {
                return (
                  <div key={href} className="flex flex-col items-center -mt-9">
                    <Link
                      href={href}
                      className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 mb-0.5 border-4 border-white/90 dark:border-gray-900/90',
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
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-500" />
                  )}
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
