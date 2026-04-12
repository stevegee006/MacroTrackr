'use client';

import { useState } from 'react';
import MacroPlanContent from './_macro-plan';
import MealPlanContent from './_meal-plan';

type Tab = 'macro' | 'meal';

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('macro');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-tutorial="macro-plan-header">Nutrition</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Plans and meals</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab('macro')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            tab === 'macro'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Macro Plan
        </button>
        <button
          onClick={() => setTab('meal')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            tab === 'meal'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Meal Plans
        </button>
      </div>

      {tab === 'macro' ? <MacroPlanContent /> : <MealPlanContent />}
    </div>
  );
}
