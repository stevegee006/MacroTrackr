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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe dark:border-gray-700 dark:bg-gray-900 lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              {...(TUTORIAL_KEYS[href] ? { 'data-tutorial': TUTORIAL_KEYS[href], 'data-tutorial-ctx': 'mobile' } : {})}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 min-h-[48px] text-[10px] transition-colors',
                isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
