'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Trash2, Loader2, Users, UtensilsCrossed, BarChart3, Brain, ChevronLeft, ChevronRight, Shield, Pencil, Plus, X, KeyRound, Copy, Check, Settings, UserPlus } from 'lucide-react';

type Tab = 'stats' | 'users' | 'food' | 'sso' | 'settings';

interface SsoProviderListItem {
  id: string;
  name: string;
  type: 'SAML' | 'OIDC';
  enabled: boolean;
  createdAt: string;
}

interface AdminStats {
  users: number;
  foodItems: number;
  foodLogs: number;
  macroPlans: number;
  mealPlans: number;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  authProvider: string;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    foodLogs: number;
    macroPlans: number;
    mealPlans: number;
  };
}

interface AdminFoodItem {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');

  if (!user?.isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <Card className="py-8 text-center text-gray-500 dark:text-gray-400">
          You do not have admin privileges.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>

      {/* Tab toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {([
          { key: 'stats' as Tab, label: 'Stats', icon: BarChart3 },
          { key: 'users' as Tab, label: 'Users', icon: Users },
          { key: 'food' as Tab, label: 'Food', icon: UtensilsCrossed },
          { key: 'sso' as Tab, label: 'SSO', icon: Shield },
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

      {tab === 'stats' && <StatsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'food' && <FoodItemsTab />}
      {tab === 'sso' && <SsoTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function StatsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<{ data: AdminStats }>('/admin/stats'),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const stats = data?.data;
  if (!stats) return null;

  const items = [
    { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-600' },
    { label: 'Food Items', value: stats.foodItems, icon: UtensilsCrossed, color: 'text-emerald-600' },
    { label: 'Food Logs', value: stats.foodLogs, icon: BarChart3, color: 'text-amber-600' },
    { label: 'Macro Plans', value: stats.macroPlans, icon: Brain, color: 'text-purple-600' },
    { label: 'Meal Plans', value: stats.mealPlans, icon: Brain, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="text-center">
          <item.icon className={`h-6 w-6 mx-auto mb-1 ${item.color}`} />
          <p className="text-2xl font-bold">{item.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordEmail, setTempPasswordEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (search) params.set('q', search);
      return apiFetch<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/admin/users/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      setResettingId(id);
      const res = await apiFetch<{ data: { tempPassword: string } }>(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return { tempPassword: res.data.tempPassword, email };
    },
    onSuccess: (data) => {
      setTempPassword(data.tempPassword);
      setTempPasswordEmail(data.email);
      setCopied(false);
    },
    onSettled: () => setResettingId(null),
  });

  const createMutation = useMutation({
    mutationFn: async (body: { email: string; password: string; displayName?: string }) => {
      const res = await apiFetch<{ data: AdminUser }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    onSuccess: (newUser) => {
      setTempPassword(createPassword);
      setTempPasswordEmail(newUser.email);
      setCopied(false);
      setShowCreateForm(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateDisplayName('');
      setCreateError('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create user');
    },
  });

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    createMutation.mutate({
      email: createEmail,
      password: createPassword,
      displayName: createDisplayName || undefined,
    });
  }

  function copyTempPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {!showCreateForm && (
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Create
          </Button>
        )}
      </div>

      {/* Create user form */}
      {showCreateForm && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Create User</h3>
            <button
              onClick={() => { setShowCreateForm(false); setCreateError(''); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <Input
              label="Email"
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
            <Input
              label="Display Name (optional)"
              value={createDisplayName}
              onChange={(e) => setCreateDisplayName(e.target.value)}
              placeholder="User's name"
            />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setCreateError(''); }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                Create User
              </Button>
            </div>
          </form>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            The user will be required to change their password on first login.
          </p>
        </Card>
      )}

      {/* Temp password modal */}
      {tempPassword && (
        <Card className="border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Temporary Password
            </h3>
            <button
              onClick={() => { setTempPassword(null); setTempPasswordEmail(null); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            For <span className="font-medium">{tempPasswordEmail}</span>
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-mono select-all">
              {tempPassword}
            </code>
            <button
              onClick={copyTempPassword}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
            </button>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
            This password is shown only once. The user will be required to change it on next login.
          </p>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">No users found</Card>
      ) : (
        <>
          {data?.data.map((u) => (
            <Card key={u.id} className="flex items-start justify-between py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{u.email}</p>
                  {u.isAdmin && (
                    <span className="text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {u.displayName || 'No name'} &middot; {u.authProvider} &middot;{' '}
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Logs: {u._count.foodLogs} &middot; Plans: {u._count.macroPlans} &middot; Meals: {u._count.mealPlans}
                </p>
              </div>
              <div className="flex items-center shrink-0 ml-2">
                {u.authProvider === 'LOCAL' && !u.isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`Reset password for ${u.email}? A temporary password will be generated.`)) {
                        resetMutation.mutate({ id: u.id, email: u.email });
                      }
                    }}
                    disabled={resettingId === u.id}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-amber-500 active:text-amber-600 transition-colors rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950"
                    title="Reset password"
                  >
                    {resettingId === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                  </button>
                )}
                {!u.isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete user ${u.email}? This cannot be undone.`)) {
                        deleteMutation.mutate(u.id);
                      }
                    }}
                    disabled={deletingId === u.id}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {deletingId === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </Card>
          ))}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function FoodItemsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<AdminFoodItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-food-items', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (search) params.set('q', search);
      return apiFetch<PaginatedResponse<AdminFoodItem>>(`/admin/food-items?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/admin/food-items/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete food item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-food-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onSettled: () => setDeletingId(null),
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search food items..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {editingItem && (
        <FoodItemEditForm
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">No food items found</Card>
      ) : (
        <>
          {data?.data.map((item) => (
            <Card key={item.id} className="flex items-start justify-between py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.brand || 'No brand'} &middot;{' '}
                  <span className="text-[10px] uppercase">{item.source}</span>
                </p>
                <p className="text-xs mt-0.5">
                  <span>{Math.round(item.caloriesPer100g)} kcal</span>
                  {' '}
                  <span className="text-blue-500">P:{Math.round(item.proteinPer100g)}g</span>
                  {' '}
                  <span className="text-amber-500">C:{Math.round(item.carbsPer100g)}g</span>
                  {' '}
                  <span className="text-red-500">F:{Math.round(item.fatPer100g)}g</span>
                  <span className="text-gray-400 dark:text-gray-500"> /100g</span>
                </p>
              </div>
              <div className="flex items-center shrink-0 ml-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-blue-500 active:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950"
                  title="Edit food item"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${item.name}"? All associated log entries will also be removed.`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  disabled={deletingId === item.id}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Card>
          ))}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function FoodItemEditForm({ item, onClose }: { item: AdminFoodItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: item.name,
    brand: item.brand || '',
    barcode: item.barcode || '',
    caloriesPer100g: String(item.caloriesPer100g),
    proteinPer100g: String(item.proteinPer100g),
    carbsPer100g: String(item.carbsPer100g),
    fatPer100g: String(item.fatPer100g),
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/admin/food-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-food-items'] });
      queryClient.invalidateQueries({ queryKey: ['foodSearch'] });
      onClose();
    },
    onError: (err: any) => setError(err.message || 'Failed to update'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate({
      name: form.name,
      brand: form.brand || undefined,
      barcode: form.barcode || undefined,
      caloriesPer100g: parseFloat(form.caloriesPer100g) || 0,
      proteinPer100g: parseFloat(form.proteinPer100g) || 0,
      carbsPer100g: parseFloat(form.carbsPer100g) || 0,
      fatPer100g: parseFloat(form.fatPer100g) || 0,
    });
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit Food Item</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Macros per 100g</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Calories"
            type="number"
            step="0.1"
            value={form.caloriesPer100g}
            onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })}
          />
          <Input
            label="Protein (g)"
            type="number"
            step="0.1"
            value={form.proteinPer100g}
            onChange={(e) => setForm({ ...form, proteinPer100g: e.target.value })}
          />
          <Input
            label="Carbs (g)"
            type="number"
            step="0.1"
            value={form.carbsPer100g}
            onChange={(e) => setForm({ ...form, carbsPer100g: e.target.value })}
          />
          <Input
            label="Fat (g)"
            type="number"
            step="0.1"
            value={form.fatPer100g}
            onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={mutation.isPending}>Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}

function SsoTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'SAML' | 'OIDC'>('OIDC');
  const [formEnabled, setFormEnabled] = useState(false);
  // OIDC fields
  const [formIssuerUrl, setFormIssuerUrl] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [formScopes, setFormScopes] = useState('');
  const [formAuthEndpoint, setFormAuthEndpoint] = useState('');
  const [formTokenEndpoint, setFormTokenEndpoint] = useState('');
  const [formUserinfoEndpoint, setFormUserinfoEndpoint] = useState('');
  // SAML fields
  const [formEntryPoint, setFormEntryPoint] = useState('');
  const [formSamlIssuer, setFormSamlIssuer] = useState('');
  const [formCert, setFormCert] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sso'],
    queryFn: () => apiFetch<{ data: SsoProviderListItem[] }>('/admin/sso'),
  });

  const apiBaseUrl = getApiUrl();
  const callbackUrlBase = `${apiBaseUrl}/auth/sso/`;

  function resetForm() {
    setFormName('');
    setFormType('OIDC');
    setFormEnabled(false);
    setFormIssuerUrl('');
    setFormClientId('');
    setFormClientSecret('');
    setFormScopes('');
    setFormAuthEndpoint('');
    setFormTokenEndpoint('');
    setFormUserinfoEndpoint('');
    setFormEntryPoint('');
    setFormSamlIssuer('');
    setFormCert('');
    setEditingId(null);
    setShowForm(false);
  }

  async function handleEdit(id: string) {
    try {
      const res = await apiFetch<{ data: any }>(`/admin/sso/${id}`);
      const p = res.data;
      setEditingId(id);
      setFormName(p.name);
      setFormType(p.type);
      setFormEnabled(p.enabled);
      if (p.type === 'OIDC') {
        setFormIssuerUrl(p.config.issuerUrl || '');
        setFormClientId(p.config.clientId || '');
        setFormClientSecret(p.config.clientSecret || '');
        setFormScopes(Array.isArray(p.config.scopes) ? p.config.scopes.join(', ') : '');
        setFormAuthEndpoint(p.config.authorizationEndpoint || '');
        setFormTokenEndpoint(p.config.tokenEndpoint || '');
        setFormUserinfoEndpoint(p.config.userinfoEndpoint || '');
      } else {
        setFormEntryPoint(p.config.entryPoint || '');
        setFormSamlIssuer(p.config.issuer || '');
        setFormCert(p.config.cert || '');
      }
      setShowForm(true);
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const callbackUrl = editingId
        ? `${callbackUrlBase}${editingId}/callback`
        : `${callbackUrlBase}placeholder/callback`;

      const oidcConfig: Record<string, unknown> = {
        issuerUrl: formIssuerUrl, clientId: formClientId, clientSecret: formClientSecret, callbackUrl,
      };
      if (formScopes.trim()) {
        oidcConfig.scopes = formScopes.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      if (formAuthEndpoint.trim()) oidcConfig.authorizationEndpoint = formAuthEndpoint.trim();
      if (formTokenEndpoint.trim()) oidcConfig.tokenEndpoint = formTokenEndpoint.trim();
      if (formUserinfoEndpoint.trim()) oidcConfig.userinfoEndpoint = formUserinfoEndpoint.trim();

      const config = formType === 'OIDC'
        ? oidcConfig
        : { entryPoint: formEntryPoint, issuer: formSamlIssuer, cert: formCert, callbackUrl };

      const body = { name: formName, type: formType, enabled: formEnabled, config };

      if (editingId) {
        await apiFetch(`/admin/sso/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        const res = await apiFetch<{ data: { id: string } }>('/admin/sso', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        // Update callbackUrl with the real ID
        const newId = res.data.id;
        await apiFetch(`/admin/sso/${newId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            config: { ...config, callbackUrl: `${callbackUrlBase}${newId}/callback` },
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-sso'] });
      resetForm();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await apiFetch(`/admin/sso/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sso'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiFetch(`/admin/sso/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sso'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure enterprise SSO providers (SAML / OIDC)
        </p>
        {!showForm && (
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Provider
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? 'Edit SSO Provider' : 'New SSO Provider'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Okta, Azure AD"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <div className="flex gap-4">
              {(['SAML', 'OIDC'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="sso-type"
                    checked={formType === t}
                    onChange={() => setFormType(t)}
                    className="accent-emerald-600"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="accent-emerald-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Enabled</span>
          </label>

          {formType === 'OIDC' ? (
            <>
              <Input
                label="Issuer URL"
                value={formIssuerUrl}
                onChange={(e) => setFormIssuerUrl(e.target.value)}
                placeholder="https://accounts.google.com"
              />
              <Input
                label="Client ID"
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                placeholder="your-client-id"
              />
              <Input
                label="Client Secret"
                type="password"
                value={formClientSecret}
                onChange={(e) => setFormClientSecret(e.target.value)}
                placeholder="your-client-secret"
              />
              <Input
                label="Scopes"
                value={formScopes}
                onChange={(e) => setFormScopes(e.target.value)}
                placeholder="openid, profile, email"
              />
              <p className="-mt-2 text-xs text-gray-400 dark:text-gray-500">
                Comma-separated. Defaults to <code className="text-[11px]">openid, profile, email</code> if left blank.
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Advanced: Override discovery endpoints
                </summary>
                <div className="mt-2 space-y-3 pl-1 border-l-2 border-gray-200 dark:border-gray-700 ml-1">
                  <Input
                    label="Authorization Endpoint"
                    value={formAuthEndpoint}
                    onChange={(e) => setFormAuthEndpoint(e.target.value)}
                    placeholder="https://idp.example.com/o/authorize/"
                  />
                  <Input
                    label="Token Endpoint"
                    value={formTokenEndpoint}
                    onChange={(e) => setFormTokenEndpoint(e.target.value)}
                    placeholder="https://idp.example.com/o/token/"
                  />
                  <Input
                    label="Userinfo Endpoint"
                    value={formUserinfoEndpoint}
                    onChange={(e) => setFormUserinfoEndpoint(e.target.value)}
                    placeholder="https://idp.example.com/o/userinfo/"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Leave blank to auto-discover from Issuer URL. Use these if your provider does not support standard OIDC discovery.
                  </p>
                </div>
              </details>
            </>
          ) : (
            <>
              <Input
                label="Entry Point URL"
                value={formEntryPoint}
                onChange={(e) => setFormEntryPoint(e.target.value)}
                placeholder="https://idp.example.com/sso/saml"
              />
              <Input
                label="Issuer"
                value={formSamlIssuer}
                onChange={(e) => setFormSamlIssuer(e.target.value)}
                placeholder="urn:example:idp"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Certificate
                </label>
                <textarea
                  value={formCert}
                  onChange={(e) => setFormCert(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={4}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500 font-mono"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Callback URL
            </label>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 break-all font-mono">
              {editingId
                ? `${callbackUrlBase}${editingId}/callback`
                : 'Will be generated after saving'}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving} disabled={!formName}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </Card>
      )}

      {(!data?.data || data.data.length === 0) && !showForm ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">
          No SSO providers configured
        </Card>
      ) : (
        data?.data.map((p) => (
          <Card key={p.id} className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <span className="text-[10px] font-semibold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  {p.type}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    p.enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                  }`}
                >
                  {p.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Created {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => toggleMutation.mutate({ id: p.id, enabled: !p.enabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  p.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={p.enabled ? 'Disable' : 'Enable'}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    p.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <button
                onClick={() => handleEdit(p.id)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete SSO provider "${p.name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(p.id);
                  }
                }}
                disabled={deletingId === p.id}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
              >
                {deletingId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const [usdaKey, setUsdaKey] = useState('');
  const [usdaSaved, setUsdaSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiFetch<{ data: { signupsEnabled: boolean; usdaApiKeySet: boolean; usdaApiKeyMasked: string | null } }>('/admin/settings'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (settings: { signupsEnabled: boolean }) => {
      await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const usdaMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ usdaApiKey: key }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setUsdaKey('');
      setUsdaSaved(true);
      setTimeout(() => setUsdaSaved(false), 3000);
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const signupsEnabled = data?.data?.signupsEnabled ?? true;
  const usdaApiKeySet = data?.data?.usdaApiKeySet ?? false;
  const usdaApiKeyMasked = data?.data?.usdaApiKeyMasked ?? null;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h3 className="font-semibold">Registration</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow New Signups</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {signupsEnabled
                ? 'Anyone can create an account via the registration page.'
                : 'Registration is disabled. Only admins can create new users.'}
            </p>
          </div>
          <button
            onClick={() => toggleMutation.mutate({ signupsEnabled: !signupsEnabled })}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              signupsEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                signupsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-semibold">USDA FoodData Central</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enables restaurant and branded food search. Get a free API key from{' '}
          <a
            href="https://fdc.nal.usda.gov/api-key-signup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            fdc.nal.usda.gov
          </a>
        </p>
        <div className="space-y-2">
          {usdaApiKeySet && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                Configured
              </span>
              <code className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {usdaApiKeyMasked}
              </code>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={usdaApiKeySet ? 'Enter new key to replace...' : 'Paste your USDA API key...'}
              value={usdaKey}
              onChange={(e) => setUsdaKey(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => usdaMutation.mutate(usdaKey)}
              disabled={!usdaKey.trim() || usdaMutation.isPending}
              isLoading={usdaMutation.isPending}
            >
              Save
            </Button>
          </div>
          {usdaApiKeySet && (
            <button
              onClick={() => {
                if (confirm('Remove the USDA API key? Restaurant & USDA search will stop working.')) {
                  usdaMutation.mutate('');
                }
              }}
              className="text-xs text-red-500 hover:text-red-600 hover:underline"
            >
              Remove key
            </button>
          )}
          {usdaSaved && (
            <p className="text-xs text-emerald-600">USDA API key saved!</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
