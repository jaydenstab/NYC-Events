import React from 'react';
import FilterSheet from './FilterSheet';
import type { SortOption } from '@/hooks/useEventSorting';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';
import type { PriceFilter } from '@/lib/price';

interface CollapsibleFiltersProps {
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
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  selectedPrice: PriceFilter;
  onPriceChange: (price: PriceFilter) => void;
  onNearMe?: () => void;
  nearMeActive?: boolean;
}

const CollapsibleFilters: React.FC<CollapsibleFiltersProps> = ({
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
  selectedDateRange,
  onDateRangeChange,
  selectedPrice,
  onPriceChange,
  onNearMe,
  nearMeActive = false,
}) => {
  return (
    <div className="hidden" data-testid="panel-filters" aria-hidden>
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
        hideTrigger
        selectedDateRange={selectedDateRange}
        onDateRangeChange={onDateRangeChange}
        selectedPrice={selectedPrice}
        onPriceChange={onPriceChange}
        onNearMe={onNearMe}
        nearMeActive={nearMeActive}
      />
    </div>
  );
};

export default React.memo(CollapsibleFilters);
