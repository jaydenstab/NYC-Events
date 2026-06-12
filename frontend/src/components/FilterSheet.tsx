import React from 'react';
import { Drawer } from 'vaul';
import { SlidersHorizontal } from 'lucide-react';
import SortControl from './SortControl';
import BoroughFilters from './BoroughFilters';
import CategoryFilters from './CategoryFilters';
import type { SortOption } from '@/hooks/useEventSorting';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onOpenChange,
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
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={`Filters${activeCount > 0 ? `, ${activeCount} active` : ''}`}
        className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-muted/50 hover:bg-muted"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
        Filters
        {activeCount > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[1100]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[1101] max-h-[85vh] flex flex-col rounded-t-3xl bg-card border border-border pb-[env(safe-area-inset-bottom)]">
            <Drawer.Handle className="mx-auto mt-3 mb-2 shrink-0" />
            <Drawer.Title className="sr-only">Filters</Drawer.Title>
            <Drawer.Description className="sr-only">
              Filter events by date, borough, price, and more.
            </Drawer.Description>
            <div className="px-5 pb-2 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-foreground" aria-hidden>
                Filters
              </h3>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-sm font-semibold text-primary"
              >
                Done
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 pb-6">
              <SortControl
                value={sort}
                onChange={onSortChange}
                hasSearchQuery={hasSearchQuery}
                hasUserLocation={hasUserLocation}
                compact
              />
              <div className="px-5 pb-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Time of day</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onTimeOfDayChange(opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        selectedTimeOfDay === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <BoroughFilters selected={selectedBorough} onChange={onBoroughChange} />
              <CategoryFilters
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
                savedMode={savedMode}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default React.memo(FilterSheet);
