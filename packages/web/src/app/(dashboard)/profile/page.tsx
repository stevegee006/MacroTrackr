'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@macrotracker/shared';
import type { UserProfile, ActivityLevel, Goal, Sex } from '@macrotracker/shared';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/users/me/profile'),
  });

  const [form, setForm] = useState({
    heightCm: '',
    weightKg: '',
    age: '',
    sex: '' as string,
    activityLevel: '' as string,
    goal: '' as string,
  });

  useEffect(() => {
    if (data?.data) {
      const p = data.data;
      setForm({
        heightCm: p.heightCm?.toString() || '',
        weightKg: p.weightKg?.toString() || '',
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
    mutation.mutate({
      heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
      weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Profile</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <Link href="/settings" className="text-sm text-emerald-600 hover:underline">
          Settings
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Height (cm)"
              type="number"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
            <Input
              label="Age"
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
            <select
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <select
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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

      <Button variant="outline" onClick={logout} className="w-full">
        Sign Out
      </Button>
    </div>
  );
}
