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
import type { UserProfile, UserSettings, ActivityLevel, Goal, Sex } from '@macrotracker/shared';
import Link from 'next/link';

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
  return lbs * KG_PER_LB;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
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

  // For metric: heightCm, weightKg
  // For imperial: feet, inches, weightLbs
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
      // Convert imperial inputs to metric for storage
      const feet = form.feet ? parseInt(form.feet) : 0;
      const inches = form.inches ? parseInt(form.inches) : 0;
      if (feet || inches) {
        heightCm = Math.round(feetInchesToCm(feet, inches) * 10) / 10;
      }
      if (form.weightLbs) {
        weightKg = Math.round(lbsToKg(parseFloat(form.weightLbs)) * 10) / 10;
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
            {isImperial ? (
              <>
                {/* Imperial height: feet + inches */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        label=""
                        type="number"
                        placeholder="ft"
                        value={form.feet}
                        onChange={(e) => setForm({ ...form, feet: e.target.value })}
                      />
                      <span className="text-xs text-gray-500">feet</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        label=""
                        type="number"
                        placeholder="in"
                        value={form.inches}
                        onChange={(e) => setForm({ ...form, inches: e.target.value })}
                      />
                      <span className="text-xs text-gray-500">inches</span>
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
                {/* Metric height + weight */}
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
