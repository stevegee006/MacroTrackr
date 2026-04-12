'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

const TUTORIAL_KEYS: Record<string, string> = {
  '/scan': 'nav-add',
  '/log': 'nav-log',
  '/macro-plan': 'nav-macros',
  '/profile': 'nav-profile',
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 bg-white/90 backdrop-blur-md pb-safe dark:border-gray-700/60 dark:bg-gray-900/90 lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              {...(TUTORIAL_KEYS[href] ? { 'data-tutorial': TUTORIAL_KEYS[href], 'data-tutorial-ctx': 'mobile' } : {})}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 px-2 min-h-[48px] text-[10px] transition-all',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
              )}
            >
              <div className="relative flex flex-col items-center gap-0.5">
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-emerald-500" />
                )}
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
