import { forwardRef, useState, useCallback } from 'react';
import { Search, X, History, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  searchLoading?: boolean;
  recentSearches?: string[];
  onRecentSelect?: (q: string) => void;
  onClearRecent?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  searchFocused?: boolean;
  onFilterClick?: () => void;
  filterActiveCount?: number;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value,
    onChange,
    searchLoading = false,
    recentSearches = [],
    onRecentSelect,
    onClearRecent,
    onFocus,
    onBlur,
    searchFocused = false,
    onFilterClick,
    filterActiveCount = 0,
  },
  ref
) {
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const showRecent = searchFocused && !value.trim() && recentSearches.length > 0;

  const selectRecent = useCallback(
    (q: string) => {
      onRecentSelect?.(q);
      setHighlightIndex(-1);
    },
    [onRecentSelect]
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showRecent) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, recentSearches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectRecent(recentSearches[highlightIndex]);
    } else if (e.key === 'Escape') {
      setHighlightIndex(-1);
    }
  };

  return (
    <div className="px-5 pb-3 shrink-0" data-testid="sticky-search">
      <div className="relative">
        <label htmlFor="events-search" className="sr-only">
          Search events
        </label>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <input
          ref={ref}
          id="events-search"
          type="search"
          placeholder="Search events, venues, or neighborhoods…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onInputKeyDown}
          aria-label="Search events"
          aria-autocomplete="list"
          aria-controls={showRecent ? 'recent-searches-list' : undefined}
          aria-activedescendant={
            showRecent && highlightIndex >= 0
              ? `recent-search-${highlightIndex}`
              : undefined
          }
          className="w-full py-3 pl-10 pr-16 border border-border rounded-xl text-sm bg-surface-elevated text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {!value.trim() && (
            <kbd className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-sidebar-border mr-0.5">
              /
            </kbd>
          )}
          {value.trim() && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchLoading && (
            <div
              className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
              aria-hidden
            />
          )}
          {onFilterClick && (
            <button
              type="button"
              onClick={onFilterClick}
              aria-label={`Filters${filterActiveCount > 0 ? `, ${filterActiveCount} active` : ''}`}
              className="relative p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden />
              {filterActiveCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary text-[8px] text-primary-foreground font-bold flex items-center justify-center">
                  {filterActiveCount}
                </span>
              )}
            </button>
          )}
        </div>
        {showRecent && (
          <div
            id="recent-searches-list"
            role="listbox"
            aria-label="Recent searches"
            className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface-elevated border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {recentSearches.map((q, idx) => (
              <button
                key={q}
                id={`recent-search-${idx}`}
                type="button"
                role="option"
                aria-selected={idx === highlightIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectRecent(q)}
                className={`w-full text-left px-4 py-2.5 text-sm truncate flex items-center gap-2 ${
                  idx === highlightIndex ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                {q}
              </button>
            ))}
            {onClearRecent && (
              <button
                type="button"
                onClick={onClearRecent}
                className="w-full text-left px-4 py-2 border-t border-sidebar-border text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Clear recent
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default SearchBar;
