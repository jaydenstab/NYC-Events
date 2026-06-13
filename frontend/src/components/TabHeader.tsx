import React from 'react';
import type { AppTab } from './BottomNav';
import type { SortOption } from '@/hooks/useEventSorting';

const SORT_LABELS: Record<SortOption, string> = {
  date: 'date',
  distance: 'distance',
  relevance: 'relevance',
};

interface TabHeaderProps {
  activeTab: AppTab;
  savedCount?: number;
  sort?: SortOption;
}

const TabHeader: React.FC<TabHeaderProps> = ({ activeTab, savedCount = 0, sort = 'date' }) => {
  if (activeTab === 'discover') return null;

  if (activeTab === 'saved') {
    return (
      <div className="pb-2 shrink-0">
        <h2 className="text-sm font-bold text-foreground">
          Saved events{savedCount > 0 ? ` (${savedCount})` : ''}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Events you&apos;ve saved with the heart button. Sorted by {SORT_LABELS[sort]} — change in
          Filters.
        </p>
      </div>
    );
  }

  return null;
};

export default React.memo(TabHeader);
