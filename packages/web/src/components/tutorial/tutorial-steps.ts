export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  /** null = centered modal with no spotlight */
  targetKey: string | null;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MacroTrackr!',
    body: "Let's take a quick tour to help you get started tracking your nutrition.",
    targetKey: null,
    placement: 'center',
  },
  {
    id: 'macro-rings',
    title: 'Your Daily Progress',
    body: 'These rings show how close you are to your daily targets for Calories, Protein, Carbs, and Fat. Tap any ring to see which foods contributed.',
    targetKey: 'macro-rings',
    placement: 'bottom',
  },
  {
    id: 'nav-add',
    title: 'Adding Food',
    body: "Tap here to add food. You can scan a barcode, search by name, enter nutrition manually, snap a photo of a label, or use AI to estimate macros from a description.",
    targetKey: 'nav-add',
    placement: 'top',
  },
  {
    id: 'add-flow',
    title: 'How It Works',
    body: "Once you find or scan a food, you'll see its nutrition info. Set your serving size and number of servings, pick the meal (Breakfast, Lunch, etc.), then tap Add to Log. All the macro totals are calculated automatically based on your serving size — no math needed!",
    targetKey: null,
    placement: 'center',
  },
  {
    id: 'add-barcode-tip',
    title: 'Barcode Tip',
    body: "You only need to scan a barcode once — after that, the food is saved and you can find it by searching. Of course, you can scan every time if you prefer!",
    targetKey: null,
    placement: 'center',
  },
  {
    id: 'nav-log',
    title: 'Food Log',
    body: "View and manage everything you've eaten today. Tap the pencil icon to edit servings, change the date, or move an item to a different meal. The macro totals update automatically when you adjust the serving size.",
    targetKey: 'nav-log',
    placement: 'top',
  },
  {
    id: 'nav-macros',
    title: 'AI Macro & Meal Plans',
    body: "Get AI-powered macro targets based on your goals, and generate full meal plans tailored to your preferences. Note: AI features (including label scanning) are BYOAI — bring your own AI key. You can set up your API key in Profile → Settings.",
    targetKey: 'nav-macros',
    placement: 'top',
  },
  {
    id: 'nav-profile',
    title: 'Your Profile',
    body: "Set up your biometrics, goals, AI provider, and preferences here. Let's get started!",
    targetKey: 'nav-profile',
    placement: 'top',
  },
];
