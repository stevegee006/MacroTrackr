'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  isHealthKitAvailable,
  getHealthKitEnabled,
  connectHealthKit,
  disconnectHealthKit,
  getTodayActiveEnergyKcal,
  getAddBurnToBudget,
  setAddBurnToBudget,
} from '@/lib/healthkit';

// React-level entry point for HealthKit. Wraps the lib facade in TanStack
// Query so settings pages and dashboard components get caching, loading
// states, and shared invalidation for free.
//
// - `available`     : can we talk to HealthKit at all (iOS native build)
// - `enabled`       : has the user turned it on
// - `todayKcal`     : today's ActiveEnergyBurned, null if unavailable
// - `connect`       : prompts for permissions and flips enabled on
// - `disconnect`    : flips enabled off (doesn't touch iOS permissions)

const ENABLED_QUERY_KEY = ['healthkit', 'enabled'] as const;
const TODAY_ACTIVE_KEY = ['healthkit', 'activeEnergyToday'] as const;
const ADD_BURN_KEY = ['healthkit', 'addBurnToBudget'] as const;

export function useHealthKit() {
  const queryClient = useQueryClient();
  const available = isHealthKitAvailable();

  const enabledQuery = useQuery({
    queryKey: ENABLED_QUERY_KEY,
    queryFn: getHealthKitEnabled,
    enabled: available,
    staleTime: Infinity, // Only changes when the user toggles it.
  });

  const todayQuery = useQuery({
    queryKey: TODAY_ACTIVE_KEY,
    queryFn: getTodayActiveEnergyKcal,
    enabled: available && enabledQuery.data === true,
    // ActiveEnergyBurned updates in near-real-time on iOS; refetch once a
    // minute while mounted so the dashboard reflects a fresh workout.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const addBurnQuery = useQuery({
    queryKey: ADD_BURN_KEY,
    queryFn: getAddBurnToBudget,
    enabled: available,
    staleTime: Infinity,
  });

  const toggleAddBurnMutation = useMutation({
    mutationFn: async (next: boolean) => {
      await setAddBurnToBudget(next);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(ADD_BURN_KEY, next);
    },
  });

  const connectMutation = useMutation({
    mutationFn: connectHealthKit,
    onSuccess: (ok) => {
      queryClient.setQueryData(ENABLED_QUERY_KEY, ok);
      if (ok) queryClient.invalidateQueries({ queryKey: TODAY_ACTIVE_KEY });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectHealthKit,
    onSuccess: () => {
      queryClient.setQueryData(ENABLED_QUERY_KEY, false);
      queryClient.setQueryData(TODAY_ACTIVE_KEY, null);
    },
  });

  return {
    available,
    enabled: enabledQuery.data === true,
    loadingEnabled: enabledQuery.isLoading,
    todayKcal: todayQuery.data ?? null,
    addBurnToBudget: addBurnQuery.data === true,
    setAddBurnToBudget: toggleAddBurnMutation.mutateAsync,
    connect: connectMutation.mutateAsync,
    connecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutateAsync,
  };
}
