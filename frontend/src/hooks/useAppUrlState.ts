import { useQueryState, parseAsString } from 'nuqs';
import { normalizeCategory, normalizeDateRange } from '@/lib/filters';
import type { SortOption } from '@/hooks/useEventSorting';
import type { PriceFilter } from '@/lib/price';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';

const VALID_SORTS: SortOption[] = ['date', 'distance', 'relevance'];
const VALID_BOROUGHS = ['all', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
const VALID_PRICES: PriceFilter[] = ['all', 'free', 'paid'];
const VALID_TIMES: TimeOfDayFilter[] = ['all', 'morning', 'afternoon', 'evening'];

function normalizeSort(sort: string | null): SortOption {
  if (sort && VALID_SORTS.includes(sort as SortOption)) return sort as SortOption;
  return 'date';
}

function normalizeBorough(borough: string | null): string {
  if (!borough || !VALID_BOROUGHS.includes(borough)) return 'all';
  return borough;
}

function normalizePrice(price: string | null): PriceFilter {
  if (price && VALID_PRICES.includes(price as PriceFilter)) return price as PriceFilter;
  return 'all';
}

function normalizeTimeOfDay(time: string | null): TimeOfDayFilter {
  if (time && VALID_TIMES.includes(time as TimeOfDayFilter)) return time as TimeOfDayFilter;
  return 'all';
}

export function useAppUrlState() {
  const [eventId, setEventId] = useQueryState('event', parseAsString.withDefault(''));
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('').withOptions({ throttleMs: 400 })
  );
  const [selectedCategory, setSelectedCategory] = useQueryState(
    'cat',
    parseAsString.withDefault('all')
  );
  const [selectedDateRange, setSelectedDateRange] = useQueryState(
    'when',
    parseAsString.withDefault('all')
  );
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('date'));
  const [selectedBorough, setSelectedBorough] = useQueryState(
    'borough',
    parseAsString.withDefault('all')
  );
  const [selectedPrice, setSelectedPrice] = useQueryState(
    'price',
    parseAsString.withDefault('all')
  );
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useQueryState(
    'time',
    parseAsString.withDefault('all')
  );

  const normalizedCategory = normalizeCategory(selectedCategory);
  const normalizedDateRange = normalizeDateRange(selectedDateRange);
  const normalizedSort = normalizeSort(sort);
  const normalizedBorough = normalizeBorough(selectedBorough);
  const normalizedPrice = normalizePrice(selectedPrice);
  const normalizedTimeOfDay = normalizeTimeOfDay(selectedTimeOfDay);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDateRange('all');
    setSelectedBorough('all');
    setSelectedPrice('all');
    setSelectedTimeOfDay('all');
    setSort('date');
  };

  const clearEventParam = () => setEventId('');

  return {
    eventId: eventId || '',
    setEventId,
    clearEventParam,
    searchQuery: searchQuery || '',
    setSearchQuery,
    selectedCategory: normalizedCategory,
    setSelectedCategory: (cat: string) => setSelectedCategory(cat),
    selectedDateRange: normalizedDateRange,
    setSelectedDateRange: (when: string) => setSelectedDateRange(when),
    sort: normalizedSort,
    setSort: (s: SortOption) => setSort(s),
    selectedBorough: normalizedBorough,
    setSelectedBorough: (b: string) => setSelectedBorough(b),
    selectedPrice: normalizedPrice,
    setSelectedPrice: (p: PriceFilter) => setSelectedPrice(p),
    selectedTimeOfDay: normalizedTimeOfDay,
    setSelectedTimeOfDay: (t: TimeOfDayFilter) => setSelectedTimeOfDay(t),
    showSavedOnly: normalizedCategory === 'saved',
    setShowSavedOnly: (saved: boolean) => setSelectedCategory(saved ? 'saved' : 'all'),
    clearAllFilters,
  };
}
