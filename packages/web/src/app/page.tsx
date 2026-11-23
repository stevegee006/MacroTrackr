'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, isLoading, router]);

  // Once auth has resolved, we've triggered the redirect — unmount our UI.
  // Next.js's static export under Capacitor can keep this component mounted
  // past the transition, and anything we render would paint on top of the
  // destination page and hide its content. Returning null means a stale
  // mount is effectively invisible.
  if (!isLoading) return null;

  // Transparent overlay (no solid bg, no pointer events) so even if the
  // mount lingers past isLoading flipping, the only thing it contributes is
  // a small spinner ring — never a full-screen curtain.
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
}
