'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { todayString, addDays } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { TimezoneCombobox } from '@/components/ui/TimezoneCombobox';
import { getBrowserTimezone, formatTimezoneLabel } from '@/lib/timezones';
import { ACTIVITY_LABELS, GOAL_LABELS, MEAL_TYPE_LABELS } from '@macrotracker/shared';
import type { UserProfile, UserSettings, MealType, AiProvider } from '@macrotracker/shared';
import Link from 'next/link';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { Activity, GraduationCap, HelpCircle, MessageSquare, Shield, Settings, Trash2, ExternalLink } from 'lucide-react';

type Tab = 'biometrics' | 'security' | 'settings';

// Conversion helpers
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;
const LB_PER_KG = 2.20462;
const IN_PER_CM = 1 / CM_PER_INCH;

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm * IN_PER_CM;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

function kgToLbs(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

function lbsToKg(lbs: number): number {
  return Math.round(lbs * KG_PER_LB * 100) / 100;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('biometrics');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>
        {user?.isAdmin && (
          <Link href="/admin" className="text-sm text-purple-600 hover:underline">
            Admin
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {([
          { key: 'biometrics' as Tab, label: 'Biometrics', icon: Activity },
          { key: 'security' as Tab, label: 'Security', icon: Shield },
          { key: 'settings' as Tab, label: 'Settings', icon: Settings },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'biometrics' && <BiometricsTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'settings' && <SettingsTab />}

      <Button variant="outline" onClick={logout} className="w-full">
        Sign Out
      </Button>
    </div>
  );
}

// ─── Biometrics Tab ────────────────────────────────────────────

function BiometricsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/users/me/profile'),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: UserSettings }>('/users/me/settings'),
  });

  const isImperial = settingsData?.data?.preferredUnits === 'IMPERIAL';

  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
    feet: '',
    inches: '',
    weightLbs: '',
    age: '',
    sex: '' as string,
    activityLevel: '' as string,
    goal: '' as string,
  });

  useEffect(() => {
    if (data?.data) {
      const p = data.data;
      const heightCm = p.heightCm ?? 0;
      const weightKg = p.weightKg ?? 0;
      const { feet, inches } = cmToFeetInches(heightCm);

      setForm({
        heightCm: p.heightCm?.toString() || '',
        weightKg: p.weightKg?.toString() || '',
        feet: heightCm ? feet.toString() : '',
        inches: heightCm ? inches.toString() : '',
        weightLbs: weightKg ? kgToLbs(weightKg).toString() : '',
        age: p.age?.toString() || '',
        sex: p.sex || '',
        activityLevel: p.activityLevel || '',
        goal: p.goal || '',
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/users/me/profile', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let heightCm: number | null = null;
    let weightKg: number | null = null;

    if (isImperial) {
      const feet = form.feet ? parseInt(form.feet) : 0;
      const inches = form.inches ? parseInt(form.inches) : 0;
      if (feet || inches) {
        heightCm = Math.round(feetInchesToCm(feet, inches) * 10) / 10;
      }
      if (form.weightLbs) {
        weightKg = lbsToKg(parseFloat(form.weightLbs));
      }
    } else {
      heightCm = form.heightCm ? parseFloat(form.heightCm) : null;
      weightKg = form.weightKg ? parseFloat(form.weightKg) : null;
    }

    mutation.mutate({
      heightCm,
      weightKg,
      age: form.age ? parseInt(form.age) : null,
      sex: form.sex || null,
      activityLevel: form.activityLevel || null,
      goal: form.goal || null,
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {isImperial ? (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        label=""
                        type="number"
                        placeholder="ft"
                        value={form.feet}
                        onChange={(e) => setForm({ ...form, feet: e.target.value })}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">feet</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        label=""
                        type="number"
                        placeholder="in"
                        value={form.inches}
                        onChange={(e) => setForm({ ...form, inches: e.target.value })}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">inches</span>
                    </div>
                  </div>
                </div>
                <Input
                  label="Weight (lbs)"
                  type="number"
                  step="0.1"
                  value={form.weightLbs}
                  onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                />
              </>
            ) : (
              <>
                <Input
                  label="Height (cm)"
                  type="number"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </>
            )}
            <Input
              label="Age"
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sex</label>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Level</label>
            <select
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">Select</option>
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
            <select
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">Select</option>
              {Object.entries(GOAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <Button type="submit" isLoading={mutation.isPending} className="w-full">
            Save Profile
          </Button>

          {mutation.isSuccess && (
            <p className="text-sm text-emerald-600 text-center">Profile saved!</p>
          )}
        </form>
      </Card>

      {data?.data.targetCalories && (
        <Card>
          <h3 className="font-semibold mb-2">Current Macro Targets</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Calories: <span className="font-medium">{data.data.targetCalories} kcal</span></div>
            <div>Protein: <span className="font-medium">{data.data.targetProteinG}g</span></div>
            <div>Carbs: <span className="font-medium">{data.data.targetCarbsG}g</span></div>
            <div>Fat: <span className="font-medium">{data.data.targetFatG}g</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Security Tab ──────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-6">
      <PasskeyCard />
      <ChangePasswordCard />
    </div>
  );
}

interface PasskeyInfo {
  id: string;
  friendlyName: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

function PasskeyCard() {
  const queryClient = useQueryClient();
  const [friendlyName, setFriendlyName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: passkeysData, isLoading } = useQuery({
    queryKey: ['passkeys'],
    queryFn: () => apiFetch<{ data: PasskeyInfo[] }>('/auth/passkey/list'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/auth/passkey/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['passkeys'] }),
  });

  async function handleRegister() {
    setError('');
    setSuccess('');
    setRegistering(true);
    try {
      const optionsRes = await apiFetch<{ data: any }>('/auth/passkey/register/options', {
        method: 'POST',
      });
      const regResponse = await startRegistration({ optionsJSON: optionsRes.data });
      await apiFetch('/auth/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          response: regResponse,
          friendlyName: friendlyName.trim() || undefined,
        }),
      });

      setSuccess('Passkey registered successfully!');
      setFriendlyName('');
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled');
      } else {
        setError(err.message || 'Failed to register passkey');
      }
    } finally {
      setRegistering(false);
    }
  }

  const passkeys = passkeysData?.data ?? [];

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold">Passkeys</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in without a password using Face ID, Touch ID, or a security key.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : passkeys.length > 0 ? (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {pk.friendlyName || 'Passkey'}
                  {pk.deviceType && (
                    <span className="ml-1 text-xs text-gray-400">({pk.deviceType})</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                  {pk.lastUsedAt && ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(pk.id)}
                disabled={deleteMutation.isPending}
                className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">No passkeys registered yet.</p>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Passkey name (optional)"
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleRegister}
          isLoading={registering}
          size="sm"
          className="whitespace-nowrap"
        >
          Add Passkey
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </Card>
  );
}

function ChangePasswordCard() {
  const { user } = useAuth();

  // Only show for LOCAL auth users
  if (user?.authProvider !== 'LOCAL') return null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to change password');
      setSuccess('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    mutation.mutate({ currentPassword, newPassword });
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold">Change Password</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Update your account password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" isLoading={mutation.isPending} className="w-full">
          Change Password
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </Card>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────

const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'GEMINI', label: 'Google Gemini' },
];

const AI_KEY_LINKS: { provider: string; url: string; label: string }[] = [
  { provider: 'OpenAI', url: 'https://platform.openai.com/api-keys', label: 'Get OpenAI API key' },
  { provider: 'Anthropic', url: 'https://console.anthropic.com/settings/keys', label: 'Get Anthropic API key' },
  { provider: 'Google Gemini', url: 'https://aistudio.google.com/apikey', label: 'Get Gemini API key' },
];

function AiProviderInfoPopover() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="How to get API keys"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popover */}
          <div className="absolute left-0 top-8 z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI features require your own API key (BYOAI). Get one from your preferred provider:
            </p>
            <div className="space-y-1.5">
              {AI_KEY_LINKS.map(({ provider, url, label }) => (
                <a
                  key={provider}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Keys are encrypted with AES-256-GCM and stored securely on the server.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const { isDark, toggle } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: UserSettings }>('/users/me/settings'),
  });

  const [aiProvider, setAiProvider] = useState<AiProvider>('OPENAI');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
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
      setAiProvider(data.data.aiProvider ?? 'OPENAI');
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
    },
  });

  const darkModeMutation = useMutation({
    mutationFn: (dark: boolean) =>
      apiFetch('/users/me/settings', { method: 'PUT', body: JSON.stringify({ darkMode: dark }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  function handleSaveAiKey(provider: AiProvider, key: string) {
    if (!key.trim()) return;
    const keyMap: Record<AiProvider, string> = {
      OPENAI: 'openaiApiKey',
      ANTHROPIC: 'anthropicApiKey',
      GEMINI: 'geminiApiKey',
    };
    mutation.mutate({ [keyMap[provider]]: key.trim() });
    if (provider === 'OPENAI') setOpenaiKey('');
    if (provider === 'ANTHROPIC') setAnthropicKey('');
    if (provider === 'GEMINI') setGeminiKey('');
  }

  function handleSwitchProvider(provider: AiProvider) {
    setAiProvider(provider);
    mutation.mutate({ aiProvider: provider });
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
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
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

      <Card className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-1.5">
          <h2 className="font-semibold">AI Provider</h2>
          <AiProviderInfoPopover />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose your AI provider for macro plans, meal plans, and label scanning. Bring your own API key (BYOAI).
        </p>

        <div className="flex gap-1.5 flex-wrap">
          {AI_PROVIDERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSwitchProvider(value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                aiProvider === value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* OpenAI */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">OpenAI</span>
              {data?.data.hasOpenaiKey && <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Configured</span>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAiKey('OPENAI', openaiKey); }} className="flex gap-2">
              <Input
                placeholder={data?.data.hasOpenaiKey ? 'Enter new key to replace' : 'sk-...'}
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" isLoading={mutation.isPending} disabled={!openaiKey.trim()}>
                Save
              </Button>
            </form>
          </div>

          {/* Anthropic */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Anthropic</span>
              {data?.data.hasAnthropicKey && <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Configured</span>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAiKey('ANTHROPIC', anthropicKey); }} className="flex gap-2">
              <Input
                placeholder={data?.data.hasAnthropicKey ? 'Enter new key to replace' : 'sk-ant-...'}
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" isLoading={mutation.isPending} disabled={!anthropicKey.trim()}>
                Save
              </Button>
            </form>
          </div>

          {/* Gemini */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Google Gemini</span>
              {data?.data.hasGeminiKey && <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Configured</span>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAiKey('GEMINI', geminiKey); }} className="flex gap-2">
              <Input
                placeholder={data?.data.hasGeminiKey ? 'Enter new key to replace' : 'AI...'}
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" isLoading={mutation.isPending} disabled={!geminiKey.trim()}>
                Save
              </Button>
            </form>
          </div>
        </div>
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
        <p className="text-sm text-emerald-600 text-center lg:col-span-2">Settings saved!</p>
      )}

      <div className="lg:col-span-2">
        <ExportCard />
      </div>

      <div className="lg:col-span-2">
        <RestartTutorialCard />
      </div>

      <div className="lg:col-span-2">
        <FeedbackCard />
      </div>
    </div>
  );
}

// ─── Export Card ───────────────────────────────────────────────

interface ExportEntry {
  logDate: string;
  mealType: MealType;
  servingQty: number;
  servingSizeG: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number | null;
  totalSugarG: number | null;
  notes: string | null;
  foodItem?: { name: string; brand: string | null } | null;
}

function ExportCard() {
  const [from, setFrom] = useState(addDays(todayString(), -30));
  const [to, setTo] = useState(todayString());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const res = await apiFetch<{ data: ExportEntry[] }>(
        `/food-log/export?from=${from}&to=${to}`,
      );
      const entries = res.data;
      if (entries.length === 0) {
        setError('No entries found for this date range.');
        return;
      }

      const headers = ['Date', 'Meal', 'Food', 'Brand', 'Servings', 'Serving Size (g)', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Notes'];
      const rows = entries.map((e) => [
        e.logDate.split('T')[0],
        MEAL_TYPE_LABELS[e.mealType] ?? e.mealType,
        e.foodItem?.name ?? '',
        e.foodItem?.brand ?? '',
        e.servingQty,
        e.servingSizeG,
        Math.round(e.totalCalories),
        Math.round(e.totalProteinG * 10) / 10,
        Math.round(e.totalCarbsG * 10) / 10,
        Math.round(e.totalFatG * 10) / 10,
        e.totalFiberG != null ? Math.round(e.totalFiberG * 10) / 10 : '',
        e.totalSugarG != null ? Math.round(e.totalSugarG * 10) / 10 : '',
        e.notes ?? '',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => {
            const str = String(cell);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(','),
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `food-log-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h3 className="font-semibold">Export Food Log</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Download your food log entries as a CSV file.
      </p>
      <div className="flex gap-2 items-end overflow-hidden">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 appearance-none [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input
            type="date"
            value={to}
            max={todayString()}
            onChange={(e) => setTo(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 appearance-none [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left"
          />
        </div>
      </div>
      <Button
        variant="outline"
        onClick={handleExport}
        isLoading={exporting}
        className="w-full"
      >
        Export to CSV
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}

// ─── Restart Tutorial Card ────────────────────────────────────

function RestartTutorialCard() {
  const router = useRouter();

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">App Tutorial</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Take a guided tour of MacroTrackr&apos;s features.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          localStorage.removeItem('macrotrackr-tutorial-complete');
          router.push('/dashboard');
          // Small delay to let navigation complete before triggering tutorial
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('tutorial-restart'));
          }, 300);
        }}
        className="w-full"
      >
        <GraduationCap className="h-4 w-4 mr-2" />
        Restart Tutorial
      </Button>
    </Card>
  );
}

// ─── Feedback Card ────────────────────────────────────────────

function FeedbackCard() {
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">Send Feedback</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Found a bug or have a feature request? We&apos;d love to hear from you.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = 'mailto:macrotracker@geehive.com?subject=MacroTrackr Feedback';
        }}
        className="w-full"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Send Feedback
      </Button>
    </Card>
  );
}
