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

  // This page is a redirect-only shell. On the web it transitions in a
  // split-second; on native iOS the Capacitor splash screen covers the
  // launch, so a loading spinner here would just end up pinned behind every
  // subsequent page under the static export (which keeps this component
  // mounted after router.replace). Render nothing — ever.
  return null;
}
