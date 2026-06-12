import React from 'react';
import { Map, Search } from 'lucide-react';
import DiscoverySuggestions from './DiscoverySuggestions';

interface EmptyStateProps {
  message: string;
  onSuggestionClick?: (query: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  onSuggestionClick,
  hasActiveFilters = false,
  onClearFilters,
  onLoadMore,
  isLoadingMore = false,
}) => {
  return (
    <div className="py-10 text-center px-4">
      <div className="flex justify-center gap-3 mb-4 text-muted-foreground/60">
        <Map className="w-10 h-10" aria-hidden />
        <Search className="w-8 h-8 mt-2" aria-hidden />
      </div>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{message}</p>
      <div className="flex flex-col items-center gap-2 mb-4">
        {hasActiveFilters && onLoadMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 disabled:opacity-60"
          >
            {isLoadingMore ? 'Loading…' : 'Load more events'}
          </button>
        )}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
          >
            Clear all filters
          </button>
        )}
      </div>
      {onSuggestionClick && (
        <DiscoverySuggestions variant="empty" onSelect={onSuggestionClick} />
      )}
    </div>
  );
};

export default React.memo(EmptyState);
