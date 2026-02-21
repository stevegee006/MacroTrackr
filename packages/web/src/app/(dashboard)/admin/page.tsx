'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Trash2, Loader2, Users, UtensilsCrossed, BarChart3, Brain, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'stats' | 'users' | 'food';

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
          { key: 'food' as Tab, label: 'Food Items', icon: UtensilsCrossed },
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

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

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
              {!u.isAdmin && (
                <button
                  onClick={() => {
                    if (confirm(`Delete user ${u.email}? This cannot be undone.`)) {
                      deleteMutation.mutate(u.id);
                    }
                  }}
                  disabled={deletingId === u.id}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950 shrink-0 ml-2"
                >
                  {deletingId === u.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
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
              <button
                onClick={() => {
                  if (confirm(`Delete "${item.name}"? All associated log entries will also be removed.`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
                disabled={deletingId === item.id}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950 shrink-0 ml-2"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
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
