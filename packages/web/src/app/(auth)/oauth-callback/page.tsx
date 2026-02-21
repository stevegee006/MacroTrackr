'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAccessToken, setRefreshToken } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login');
      return;
    }

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);

    refreshUser().then(() => {
      router.replace('/dashboard');
    }).catch(() => {
      router.replace('/login');
    });
  }, [searchParams, refreshUser, router]);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Completing sign in...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
