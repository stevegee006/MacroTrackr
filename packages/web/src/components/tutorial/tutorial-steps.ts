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
    title: 'Add Food',
    body: 'Scan a barcode, search by name, enter nutrition manually, or snap a photo of a label. You can also use AI to estimate macros.',
    targetKey: 'nav-add',
    placement: 'top',
  },
  {
    id: 'nav-log',
    title: 'Food Log',
    body: "View and manage everything you've eaten today. You can edit servings or remove entries.",
    targetKey: 'nav-log',
    placement: 'top',
  },
  {
    id: 'nav-macros',
    title: 'AI Macro & Meal Plans',
    body: 'Get AI-powered macro targets based on your goals, and generate full meal plans tailored to your preferences.',
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
