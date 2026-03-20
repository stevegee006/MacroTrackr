export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** null = centered modal with no spotlight */
  targetKey: string | null;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** If set, navigate to this route before showing the step */
  route?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MacroTrackr!',
    body: "Let's take a quick tour to help you get started tracking your nutrition.",
    targetKey: null,
    placement: 'center',
    route: '/dashboard',
  },
  {
    id: 'macro-rings',
    title: 'Your Daily Progress',
    body: 'These rings show how close you are to your daily targets for Calories, Protein, Carbs, and Fat. Tap any ring to see which foods contributed.',
    targetKey: 'macro-rings',
    placement: 'bottom',
  },
  {
    id: 'scan-tabs',
    title: 'Add Food 5 Ways',
    body: "This is where you add food. Choose from Search, Barcode, Label (photo), Manual entry, or AI Estimate.",
    targetKey: 'scan-tab-selector',
    placement: 'bottom',
    route: '/scan',
  },
  {
    id: 'scan-search',
    title: 'Search for Foods',
    body: "Search by name to find foods from your personal database and USDA. Once you've added a food, it shows up here instantly next time.",
    targetKey: 'scan-search-area',
    placement: 'bottom',
  },
  {
    id: 'add-flow',
    title: 'How Adding Works',
    body: "Once you find or scan a food, you'll see its nutrition info. Set your serving size and number of servings, pick the meal (Breakfast, Lunch, etc.), then tap Add to Log. All the macro totals are calculated automatically based on your serving size — no math needed!",
    targetKey: null,
    placement: 'center',
  },
  {
    id: 'barcode-tip',
    title: 'Barcode Tip',
    body: "You only need to scan a barcode once — after that, the food is saved and you can find it by searching. Of course, you can scan every time if you prefer!",
    targetKey: null,
    placement: 'center',
  },
  {
    id: 'log-date-nav',
    title: 'Navigate Between Days',
    body: "Use the arrows to move between days. You can view past entries or pre-log food for upcoming days.",
    targetKey: 'log-date-nav',
    placement: 'bottom',
    route: '/log',
  },
  {
    id: 'log-entries',
    title: 'Your Food Entries',
    body: "Each entry shows the food name, servings, and macro breakdown. Tap the pencil icon to edit servings, change the date, or move an item to a different meal. Macros update automatically when you adjust the serving size.",
    targetKey: 'log-entries',
    placement: 'top',
  },
  {
    id: 'macro-plan',
    title: 'AI Macro & Meal Plans',
    body: "Get AI-powered macro targets based on your goals, and generate full meal plans tailored to your preferences. Note: AI features (including label scanning) are BYOAI — bring your own AI key. You can set up your key in Profile \u2192 Settings.",
    targetKey: 'macro-plan-header',
    placement: 'bottom',
    route: '/macro-plan',
  },
  {
    id: 'profile-settings',
    title: 'Your Profile & Settings',
    body: "Set up your biometrics (height, weight, goals), manage security (passkeys, password), and configure settings (AI provider, units, dark mode).",
    targetKey: 'profile-tab-bar',
    placement: 'bottom',
    route: '/profile',
  },
  {
    id: 'finish',
    title: "You're All Set!",
    body: "Start tracking your nutrition! You can restart this tutorial anytime from Profile \u2192 Settings.",
    targetKey: null,
    placement: 'center',
  },
];
