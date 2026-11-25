'use client';

import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useHealthKit } from '@/hooks/useHealthKit';

// Profile Settings card for the Apple Health integration. iOS only — the
// hook's `available` flag hides it on web/Android where there's no
// equivalent to wire up.
//
// States:
//   - Not connected:  "Connect Apple Health" button + rationale
//   - Connected:      confirmation badge, today's active-energy preview,
//                     the "Add to today's target" sub-toggle (Phase 2),
//                     and a "Disconnect" button

export function AppleHealthCard() {
  const hk = useHealthKit();

  if (!hk.available) return null;

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40">
          <Activity className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Apple Health</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Read workout calories to show your daily activity next to your
            macros, and write each meal you log into the Health app's
            Nutrition tab.
          </p>
        </div>
      </div>

      {hk.enabled ? (
        <>
          <div className="rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Connected
              </span>
              {hk.todayKcal !== null && (
                <span className="text-emerald-700/80 dark:text-emerald-300/80">
                  {hk.todayKcal} cal burned today
                </span>
              )}
            </div>
          </div>

          {/*
            Phase-2 sub-setting: when on, the dashboard reframes the burn
            as a calorie deficit metric rather than license to eat more.
            The calorie target doesn't move — the burn row below the
            macro ring shows the day's combined deficit (under-target +
            activity) so progress toward weight goals is visible without
            the moving-goalpost effect.
          */}
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <input
              type="checkbox"
              checked={hk.addBurnToBudget}
              onChange={(e) => void hk.setAddBurnToBudget(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Count activity as calorie deficit
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Shows your activity burn as a deficit toward today&apos;s
                target rather than raising the target. Your calorie goal
                stays fixed — activity just surfaces as progress alongside
                under-eating.
              </div>
            </div>
          </label>

          <Button
            variant="secondary"
            onClick={() => void hk.disconnect()}
            className="w-full"
          >
            Disconnect
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            To fully revoke access, open Settings → Health → Data Access &amp;
            Devices → MacroTrackr on your iPhone.
          </p>
        </>
      ) : (
        <Button
          onClick={() => void hk.connect()}
          isLoading={hk.connecting}
          className="w-full"
        >
          Connect Apple Health
        </Button>
      )}
    </Card>
  );
}
