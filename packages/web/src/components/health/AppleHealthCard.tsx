'use client';

import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useHealthKit } from '@/hooks/useHealthKit';

// Profile Settings card for the Apple Health integration. Only renders on
// iOS (hook's `available` flag). Shows one of three states:
//   - Not connected:  "Connect Apple Health" button + rationale
//   - Connected:      green confirmation + today's active energy preview +
//                     "Disconnect" button
//   - Loading:        subtle spinner inside the Connect button

export function AppleHealthCard() {
  const hk = useHealthKit();

  // Hide the entire card on non-iOS — there's no equivalent surface on web
  // or Android, and seeing a dead toggle is worse than not seeing anything.
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
