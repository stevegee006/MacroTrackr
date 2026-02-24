'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useTheme } from '@/providers/ThemeProvider';
import { TimezoneCombobox } from '@/components/ui/TimezoneCombobox';
import { getBrowserTimezone, formatTimezoneLabel } from '@/lib/timezones';
import type { UserSettings } from '@macrotracker/shared';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isDark, toggle } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: UserSettings }>('/users/me/settings'),
  });

  const [apiKey, setApiKey] = useState('');
  const [preferredUnits, setPreferredUnits] = useState('METRIC');
  const [timezone, setTimezone] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [mealieUrl, setMealieUrl] = useState('');
  const [mealieApiKey, setMealieApiKey] = useState('');
  const [tzAutoDetected, setTzAutoDetected] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setPreferredUnits(data.data.preferredUnits);
      setTimezone(data.data.timezone);
      setLocation(data.data.location ?? '');
    }
  }, [data]);

  // Auto-detect timezone on first load if not set
  useEffect(() => {
    if (data?.data && data.data.timezone === null && !tzAutoDetected) {
      const detected = getBrowserTimezone();
      setTimezone(detected);
      setTzAutoDetected(true);
      mutation.mutate({ timezone: detected });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tzAutoDetected]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/users/me/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setApiKey('');
    },
  });

  const darkModeMutation = useMutation({
    mutationFn: (dark: boolean) =>
      apiFetch('/users/me/settings', { method: 'PUT', body: JSON.stringify({ darkMode: dark }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (apiKey.trim()) {
      mutation.mutate({ openaiApiKey: apiKey.trim() });
    }
  }

  function handleSaveUnits() {
    mutation.mutate({ preferredUnits });
  }

  function handleToggleDarkMode() {
    const newDark = !isDark;
    toggle();
    darkModeMutation.mutate(newDark);
  }

  const mealieMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/users/me/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setMealieApiKey('');
    },
  });

  function handleSaveMealie(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    if (mealieUrl.trim()) body.mealieUrl = mealieUrl.trim();
    if (mealieApiKey.trim()) body.mealieApiKey = mealieApiKey.trim();
    if (Object.keys(body).length > 0) {
      mealieMutation.mutate(body);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Dark Mode</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
          </div>
          <button
            onClick={handleToggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDark ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">OpenAI API Key</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Required for AI-powered macro plans and meal plans. Your key is encrypted and stored securely.
        </p>
        {data?.data.hasOpenaiKey && (
          <p className="text-sm text-emerald-600">API key is configured.</p>
        )}
        <form onSubmit={handleSaveApiKey} className="flex gap-2">
          <Input
            placeholder={data?.data.hasOpenaiKey ? 'Enter new key to replace' : 'sk-...'}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" isLoading={mutation.isPending} disabled={!apiKey.trim()}>
            Save
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Units</h2>
        <div className="flex gap-2">
          {(['METRIC', 'IMPERIAL'] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => setPreferredUnits(unit)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                preferredUnits === unit
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {unit === 'METRIC' ? 'Metric (kg, cm)' : 'Imperial (lbs, in)'}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleSaveUnits}>
          Save Units
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Timezone & Location</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set your timezone for accurate date handling. Location is optional.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timezone
            </label>
            <TimezoneCombobox value={timezone} onChange={setTimezone} />
            {timezone && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Current: {formatTimezoneLabel(timezone)}
              </p>
            )}
          </div>
          <Input
            label="Location"
            placeholder="e.g. New York, NY"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const body: Record<string, unknown> = {};
            if (timezone) body.timezone = timezone;
            body.location = location.trim() || null;
            mutation.mutate(body);
          }}
        >
          Save Timezone & Location
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Mealie Integration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your Mealie instance to import recipes into meal plans. Your API key is encrypted and stored securely.
        </p>
        {data?.data.hasMealieConfig ? (
          <p className="text-sm text-emerald-600">Mealie is configured.</p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">Not configured.</p>
        )}
        <form onSubmit={handleSaveMealie} className="space-y-3">
          <Input
            label="Mealie URL"
            placeholder="https://mealie.example.com"
            type="url"
            value={mealieUrl}
            onChange={(e) => setMealieUrl(e.target.value)}
          />
          <Input
            label="Mealie API Key"
            placeholder={data?.data.hasMealieConfig ? 'Enter new key to replace' : 'API key from Mealie'}
            type="password"
            value={mealieApiKey}
            onChange={(e) => setMealieApiKey(e.target.value)}
          />
          <Button
            type="submit"
            isLoading={mealieMutation.isPending}
            disabled={!mealieUrl.trim() && !mealieApiKey.trim()}
          >
            Save Mealie Config
          </Button>
        </form>
        {mealieMutation.isError && (
          <p className="text-sm text-red-600">
            {(mealieMutation.error as any)?.message || 'Failed to save Mealie configuration'}
          </p>
        )}
        {mealieMutation.isSuccess && (
          <p className="text-sm text-emerald-600">Mealie configuration saved!</p>
        )}
      </Card>

      {mutation.isSuccess && (
        <p className="text-sm text-emerald-600 text-center">Settings saved!</p>
      )}
    </div>
  );
}
