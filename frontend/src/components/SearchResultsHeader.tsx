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
  filteredCount?: number;
  searchLoading?: boolean;
  isSearching?: boolean;
  searchTotalCount?: number;
  searchCapped?: boolean;
  searchLimit?: number;
  sort: SortOption;
  showSearchCatalogNote?: boolean;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  searchQuery,
  eventsCount,
  filteredCount,
  searchLoading = false,
  isSearching = false,
  searchTotalCount,
  searchCapped = false,
  searchLimit = 50,
  sort,
  showSearchCatalogNote = false,
}) => {
  const trimmed = searchQuery.trim();
  if (trimmed.length < 2) return null;

  if (searchLoading) {
    return (
      <p
        className="pt-3 pb-1 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Searching…
      </p>
    );
  }

  const displayCount = filteredCount ?? eventsCount;
  const countLabel =
    isSearching &&
    searchTotalCount != null &&
    displayCount < searchTotalCount &&
    displayCount !== searchTotalCount
      ? `${displayCount} of ${searchTotalCount}`
      : String(displayCount);

  const capNote =
    isSearching && searchCapped
      ? ` · Showing top ${searchLimit} matches`
      : '';

  return (
    <div className="pt-3 pb-1">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {countLabel} result{displayCount === 1 ? '' : 's'} for &ldquo;{trimmed}&rdquo; · sorted{' '}
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
