import React from 'react';
import { X } from 'lucide-react';
import { hasActiveFilters, getDateRangeLabel, type FilterState } from '@/lib/filters';
import { getPriceFilterLabel } from '@/lib/price';
import { getTimeOfDayLabel } from '@/lib/timeOfDay';

interface FilterChipsProps {
  filters: FilterState;
  onClearAll: () => void;
  onRemoveSearch: () => void;
  onRemoveCategory: () => void;
  onRemoveDate: () => void;
  onRemoveSaved: () => void;
  onRemoveBorough: () => void;
  onRemovePrice: () => void;
  onRemoveTimeOfDay: () => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onClearAll,
  onRemoveSearch,
  onRemoveCategory,
  onRemoveDate,
  onRemoveSaved,
  onRemoveBorough,
  onRemovePrice,
  onRemoveTimeOfDay,
}) => {
  if (!hasActiveFilters(filters)) return null;

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.searchQuery.trim()) {
    chips.push({
      key: 'q',
      label: `"${filters.searchQuery.trim()}"`,
      onRemove: onRemoveSearch,
    });
  }
  if (filters.showSavedOnly) {
    chips.push({ key: 'saved', label: 'Saved', onRemove: onRemoveSaved });
  } else if (filters.selectedCategory !== 'all') {
    chips.push({
      key: 'cat',
      label: filters.selectedCategory,
      onRemove: onRemoveCategory,
    });
  }
  if (filters.selectedBorough !== 'all') {
    chips.push({
      key: 'borough',
      label: filters.selectedBorough,
      onRemove: onRemoveBorough,
    });
  }
  if (filters.selectedDateRange !== 'all') {
    chips.push({
      key: 'when',
      label: getDateRangeLabel(filters.selectedDateRange),
      onRemove: onRemoveDate,
    });
  }
  if (filters.selectedPrice !== 'all') {
    chips.push({
      key: 'price',
      label: getPriceFilterLabel(filters.selectedPrice),
      onRemove: onRemovePrice,
    });
  }
  if (filters.selectedTimeOfDay !== 'all') {
    chips.push({
      key: 'time',
      label: getTimeOfDayLabel(filters.selectedTimeOfDay),
      onRemove: onRemoveTimeOfDay,
    });
  }

  return (
    <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-caption font-semibold capitalize"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label} filter`}
            className="p-0.5 rounded-full hover:bg-primary/20"
          >
            <X className="w-3 h-3" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground underline"
      >
        Clear all
      </button>
    </div>
  );
};

export default React.memo(FilterChips);
