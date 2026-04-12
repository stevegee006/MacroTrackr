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
      <div className="relative">
        {/* Top border lines — left and right of the notch gap */}
        <div className="absolute inset-x-0 top-0 flex items-start">
          <div className="flex-1 h-[1px] bg-gray-200/80 dark:bg-gray-700/60" />
          <div className="w-[72px] shrink-0" />
          <div className="flex-1 h-[1px] bg-gray-200/80 dark:bg-gray-700/60" />
        </div>

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
                        'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 mb-0.5 ring-[5px] ring-white/90 dark:ring-gray-900/90',
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
