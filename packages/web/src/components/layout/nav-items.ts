import { LayoutDashboard, PlusCircle, UtensilsCrossed, Brain, ChefHat, User } from 'lucide-react';

export const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/scan', label: 'Add', icon: PlusCircle },
  { href: '/log', label: 'Log', icon: UtensilsCrossed },
  { href: '/macro-plan', label: 'Macros', icon: Brain },
  { href: '/meal-plan', label: 'Meals', icon: ChefHat },
  { href: '/profile', label: 'Profile', icon: User },
];
