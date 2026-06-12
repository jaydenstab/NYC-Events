import type { PriceFilter } from '@/lib/price';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';

export interface FilterState {
  searchQuery: string;
  selectedCategory: string;
  selectedDateRange: string;
  selectedBorough: string;
  selectedPrice: PriceFilter;
  selectedTimeOfDay: TimeOfDayFilter;
  showSavedOnly: boolean;
}

export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.searchQuery.trim()) count += 1;
  if (filters.showSavedOnly) count += 1;
  else if (filters.selectedCategory !== 'all') count += 1;
  if (filters.selectedDateRange !== 'all') count += 1;
  if (filters.selectedBorough !== 'all') count += 1;
  if (filters.selectedPrice !== 'all') count += 1;
  if (filters.selectedTimeOfDay !== 'all') count += 1;
  return count;
}

const DATE_LABELS: Record<string, string> = {
  today: 'today',
  tomorrow: 'tomorrow',
  weekend: 'this weekend',
  week: 'this week',
};

export function hasActiveFilters(filters: FilterState): boolean {
  return countActiveFilters(filters) > 0;
}

export interface EmptyStateOptions {
  savedCount?: number;
  savedHydrating?: boolean;
}

export function buildEmptyStateMessage(
  filters: FilterState,
  options: EmptyStateOptions = {}
): string {
  const parts: string[] = [];

  if (filters.showSavedOnly) {
    const savedCount = options.savedCount ?? 0;
    if (savedCount > 0) {
      if (options.savedHydrating) {
        return `Loading your ${savedCount} saved event${savedCount === 1 ? '' : 's'}…`;
      }
      return `None of your ${savedCount} saved events match the current filters. Try clearing filters or load more of the catalog.`;
    }
    return 'No saved events yet. Tap the heart on events you want to keep.';
  }

  if (filters.selectedCategory !== 'all') {
    parts.push(filters.selectedCategory);
  }

  if (filters.selectedBorough !== 'all') {
    parts.push(`in ${filters.selectedBorough}`);
  }

  if (filters.selectedPrice === 'free') {
    parts.push('free');
  } else if (filters.selectedPrice === 'paid') {
    parts.push('paid');
  }

  const q = filters.searchQuery.trim();
  if (q) {
    if (parts.length) {
      return `No ${parts.join(' ')} events match "${q}" — try clearing a filter.`;
    }
    return `No events match "${q}" — try different keywords.`;
  }

  if (filters.selectedDateRange !== 'all') {
    const when = DATE_LABELS[filters.selectedDateRange] || filters.selectedDateRange;
    if (parts.length) {
      return `No ${parts.join(' ')} events for ${when}. Try expanding your date range.`;
    }
    return `No events for ${when}. Try a different date range.`;
  }

  if (parts.length) {
    return `No ${parts.join(' ')} events found. Try another filter.`;
  }

  return 'No events found. Try adjusting your filters.';
}

export function getDateRangeLabel(range: string): string {
  if (range === 'weekend') return 'This weekend (Fri–Sun)';
  if (range === 'week') return 'This week';
  if (range === 'all') return 'All dates';
  return range.charAt(0).toUpperCase() + range.slice(1);
}

export const VALID_DATE_RANGES = ['all', 'today', 'tomorrow', 'weekend', 'week'] as const;
export type DateRange = (typeof VALID_DATE_RANGES)[number];

export const VALID_CATEGORIES = [
  'all',
  'music',
  'art',
  'food & drink',
  'comedy',
  'free',
  'sports',
  'education',
  'health & wellness',
  'technology',
  'theater',
  'outdoor',
  'nightlife',
  'saved',
  'other',
] as const;

export function normalizeCategory(cat: string | null): string {
  if (!cat || !VALID_CATEGORIES.includes(cat as (typeof VALID_CATEGORIES)[number])) {
    return 'all';
  }
  return cat;
}

export function normalizeDateRange(when: string | null): DateRange {
  if (!when || !VALID_DATE_RANGES.includes(when as DateRange)) return 'all';
  return when as DateRange;
}
