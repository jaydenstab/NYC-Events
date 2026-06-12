import React from 'react';
import type { SortOption } from '@/hooks/useEventSorting';

const SORT_LABELS: Record<SortOption, string> = {
  date: 'by date',
  distance: 'by distance',
  relevance: 'by relevance',
};

interface SearchResultsHeaderProps {
  searchQuery: string;
  eventsCount: number;
  searchLoading?: boolean;
  isSearching?: boolean;
  searchTotalCount?: number;
  sort: SortOption;
  showSearchCatalogNote?: boolean;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  searchQuery,
  eventsCount,
  searchLoading = false,
  isSearching = false,
  searchTotalCount,
  sort,
  showSearchCatalogNote = false,
}) => {
  const trimmed = searchQuery.trim();
  if (trimmed.length < 2) return null;

  if (searchLoading) {
    return (
      <p
        className="px-5 pt-3 pb-1 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Searching…
      </p>
    );
  }

  const countLabel = isSearching
    ? String(eventsCount)
    : searchTotalCount != null && searchTotalCount > eventsCount
      ? `${eventsCount} of ${searchTotalCount}`
      : String(eventsCount);

  const capNote =
    isSearching &&
    searchTotalCount != null &&
    eventsCount >= searchTotalCount &&
    searchTotalCount >= 50
      ? ' · Showing top matches'
      : '';

  return (
    <div className="px-5 pt-3 pb-1">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {countLabel} result{eventsCount === 1 ? '' : 's'} for &ldquo;{trimmed}&rdquo; · sorted{' '}
        {SORT_LABELS[sort]}
        {capNote}
      </p>
      {showSearchCatalogNote && (
        <p className="text-[11px] text-muted-foreground/80 mt-1">
          Search runs the full index. Clear search to browse and load more of the catalog.
        </p>
      )}
    </div>
  );
};

export default React.memo(SearchResultsHeader);
