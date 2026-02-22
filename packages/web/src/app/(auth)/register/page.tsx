'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState<boolean | null>(null);
  const [checkingProviders, setCheckingProviders] = useState(true);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/auth/providers`)
      .then((res) => res.json())
      .then((json) => {
        setSignupsEnabled(json.data?.signupsEnabled ?? true);
      })
      .catch(() => {
        // If we can't check, assume enabled
        setSignupsEnabled(true);
      })
      .finally(() => setCheckingProviders(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingProviders) {
    return (
      <Card className="p-8">
        <div className="flex justify-center py-8"><Spinner /></div>
      </Card>
    );
  }

  if (signupsEnabled === false) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Registration Disabled
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          New account registration is currently disabled. Contact your administrator for access.
        </p>
        <Link href="/login" className="text-emerald-600 hover:underline text-sm font-medium">
          Go to Login
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking your macros</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          required
          minLength={8}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
