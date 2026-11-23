'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Spinner } from '@/components/ui/Spinner';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tutorial = useTutorial();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Scroll to top on route change to prevent stale scroll position.
  // WKWebView can open a page with a non-zero contentOffset after its own
  // viewport-fit=cover layout pass, which hides the top of the page behind
  // what looks like empty safe-area space. Reset via document.documentElement
  // (which iOS honors even when window.scrollTo races) and repeat after a
  // frame + a short timeout so the final layout sticks at 0.
  useEffect(() => {
    const reset = () => {
      try {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      window.scrollTo(0, 0);
    };
    reset();
    const raf = requestAnimationFrame(reset);
    const t = setTimeout(reset, 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [pathname]);

  if (isLoading) {
    // Transparent overlay with no pointer events: Next.js App Router on
    // Capacitor's static export has been observed keeping the loading UI
    // mounted beside the ready content. A solid bg would paint a full-
    // screen curtain over the destination page's content; a transparent
    // overlay means a stale mount only contributes a small spinner ring.
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <Spinner />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen lg:flex">
      <SidebarNav />
      <div className="flex-1 lg:pl-64">
        {/*
          Bottom padding must clear the fixed BottomNav (~60px of its own height)
          PLUS the home-indicator safe-area inset (~34px on iPhones with notch/Dynamic
          Island). Using a static pb-24 (96px) was tight and the WKWebView's
          scroll bounce could drift content under the nav. The arbitrary calc keeps
          it exact across devices: 5.5rem of visual clearance above the nav + the
          device's actual safe-area-inset-bottom.
        */}
        <main className="mx-auto max-w-lg lg:max-w-5xl px-4 lg:px-8 pt-safe pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
      </div>
      <BottomNav />
      <TutorialOverlay {...tutorial} />
    </div>
  );
}
