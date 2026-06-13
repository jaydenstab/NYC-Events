import { Compass, Heart, User, type LucideIcon } from 'lucide-react';
import type { AppTab } from '@/components/BottomNav';

export interface AppTabDef {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  showSavedBadge?: boolean;
}

export const APP_TABS: AppTabDef[] = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'saved', label: 'Saved', icon: Heart, showSavedBadge: true },
  { id: 'profile', label: 'Profile', icon: User },
];

export function formatSavedBadgeCount(count: number): string {
  if (count <= 0) return '';
  if (count > 99) return '99+';
  return String(count);
}
