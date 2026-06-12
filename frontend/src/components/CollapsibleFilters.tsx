import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SortControl from './SortControl';
import BoroughFilters from './BoroughFilters';
import CategoryFilters from './CategoryFilters';
import FilterSheet from './FilterSheet';
import type { SortOption } from '@/hooks/useEventSorting';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';

interface CollapsibleFiltersProps {
  isMobile: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  filterSheetOpen: boolean;
  onFilterSheetOpenChange: (open: boolean) => void;
  activeCount: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  hasSearchQuery: boolean;
  hasUserLocation: boolean;
  selectedBorough: string;
  onBoroughChange: (borough: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  savedMode?: boolean;
  selectedTimeOfDay: TimeOfDayFilter;
  onTimeOfDayChange: (time: TimeOfDayFilter) => void;
}

const TIME_OPTIONS: { value: TimeOfDayFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const CollapsibleFilters: React.FC<CollapsibleFiltersProps> = ({
  isMobile,
  expanded,
  onExpandedChange,
  filterSheetOpen,
  onFilterSheetOpenChange,
  activeCount,
  sort,
  onSortChange,
  hasSearchQuery,
  hasUserLocation,
  selectedBorough,
  onBoroughChange,
  selectedCategory,
  onCategoryChange,
  savedMode = false,
  selectedTimeOfDay,
  onTimeOfDayChange,
}) => {
  if (isMobile) {
    return (
      <div className="px-5 pb-2 shrink-0" data-testid="panel-filters">
        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={onFilterSheetOpenChange}
          activeCount={activeCount}
          sort={sort}
          onSortChange={onSortChange}
          hasSearchQuery={hasSearchQuery}
          hasUserLocation={hasUserLocation}
          selectedBorough={selectedBorough}
          onBoroughChange={onBoroughChange}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          savedMode={savedMode}
          selectedTimeOfDay={selectedTimeOfDay}
          onTimeOfDayChange={onTimeOfDayChange}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0" data-testid="panel-filters">
      <div className="flex items-center gap-2 px-5 py-2">
        <SortControl
          value={sort}
          onChange={onSortChange}
          hasSearchQuery={hasSearchQuery}
          hasUserLocation={hasUserLocation}
          compact
          className="flex-1 !px-0 !pb-0"
        />
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-muted/50 hover:bg-muted shrink-0"
        >
          Filters
          {activeCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>
      </div>

      {expanded && (
        <>
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground w-full mb-0.5">Time of day</span>
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTimeOfDayChange(opt.value)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                  selectedTimeOfDay === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <BoroughFilters selected={selectedBorough} onChange={onBoroughChange} />
          <CategoryFilters
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            savedMode={savedMode}
          />
        </>
      )}
    </div>
  );
};

export default React.memo(CollapsibleFilters);
