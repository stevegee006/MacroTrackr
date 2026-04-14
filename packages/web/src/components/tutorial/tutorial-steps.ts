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
  // ── Welcome ──
  {
    id: 'welcome',
    title: 'Welcome to MacroTrackr!',
    body: "Let\u2019s take a quick tour of everything you can do. It\u2019ll only take a minute!",
    targetKey: null,
    placement: 'center',
    route: '/dashboard',
  },

  // ── Dashboard ──
  {
    id: 'macro-rings',
    title: 'Your Daily Progress',
    body: 'These rings track Calories, Protein, Carbs, and Fat against your daily targets. Tap any ring to see a per-food breakdown. The streak counter shows how many days in a row you\u2019ve logged.',
    targetKey: 'macro-rings',
    placement: 'bottom',
  },
  {
    id: 'quick-add',
    title: 'Smart Quick-Add',
    body: 'These suggestions are your most frequently logged foods for the current meal time \u2014 breakfast foods in the morning, lunch at midday, and so on. Tap one to log it instantly.',
    targetKey: 'quick-add-strip',
    placement: 'bottom',
  },

  // ── Adding Food ──
  {
    id: 'scan-tabs',
    title: 'Add Food 5 Ways',
    body: 'Search by name, scan a barcode, photograph a nutrition label, enter macros manually, or describe a food and let AI estimate it.',
    targetKey: 'scan-tab-selector',
    placement: 'bottom',
    route: '/scan',
  },
  {
    id: 'scan-search',
    title: 'Search for Foods',
    body: 'Search your personal database and USDA. Once you add a food, it\u2019s saved for instant lookup next time.',
    targetKey: 'scan-search-area',
    placement: 'bottom',
  },
  {
    id: 'add-flow',
    title: 'Logging a Food',
    body: 'Set your serving size and number of servings, pick the meal type, then tap Add to Log. Pro tip: the serving size field supports math \u2014 type "150-32" if you forgot to tare your scale!',
    targetKey: null,
    placement: 'center',
  },

  // ── Food Log ──
  {
    id: 'log-date-nav',
    title: 'Navigate Between Days',
    body: 'Use the arrows to view past entries or pre-log food for upcoming days.',
    targetKey: 'log-date-nav',
    placement: 'bottom',
    route: '/log',
  },
  {
    id: 'log-entries',
    title: 'Your Food Entries',
    body: 'Each meal shows calorie and macro pill badges. Tap the pencil to edit servings, change the date, or move an item to a different meal.',
    targetKey: 'log-entries',
    placement: 'top',
  },

  // ── Trends ──
  {
    id: 'trends',
    title: 'Track Your Trends',
    body: 'The Nutrition tab shows 7-day bar charts for all your macros. Switch to the Body tab to see weight, body fat, and measurement trends over 30 days.',
    targetKey: 'trends-tabs',
    placement: 'bottom',
    route: '/trends',
  },

  // ── Nutrition / AI ──
  {
    id: 'macro-plan',
    title: 'AI Macro & Meal Plans',
    body: 'Generate personalized macro targets and full meal plans with recipes using AI. Supports OpenAI, Anthropic, and Gemini \u2014 bring your own API key (set it up in Profile \u2192 Settings).',
    targetKey: 'macro-plan-header',
    placement: 'bottom',
    route: '/nutrition',
  },

  // ── Profile ──
  {
    id: 'profile-settings',
    title: 'Profile & Biometrics',
    body: 'Set up your height, birthday, sex, activity level, and goals. Your weight is tracked automatically from the Measurements tab.',
    targetKey: 'profile-tab-bar',
    placement: 'bottom',
    route: '/profile',
  },
  {
    id: 'body-tracking',
    title: 'Body Measurements',
    body: 'Switch to Measurements to log weigh-ins, body fat %, lean mass, and 12 body circumference measurements. Your latest weight auto-syncs to your profile. Track progress photos in the Photos tab!',
    targetKey: 'bio-sub-tabs',
    placement: 'bottom',
  },

  // ── Sharing ──
  {
    id: 'sharing',
    title: 'Share Your Progress',
    body: 'Tap the share icon on your macro rings to generate a high-res image of your daily progress \u2014 complete with rings, fiber/sugar badges, and your streak. Share it with friends or save it!',
    targetKey: 'macro-rings',
    placement: 'bottom',
    route: '/dashboard',
  },

  // ── Finish ──
  {
    id: 'finish',
    title: "You\u2019re All Set!",
    body: 'Start tracking your nutrition! You can restart this tutorial anytime from Profile \u2192 Settings.',
    targetKey: null,
    placement: 'center',
  },
];
