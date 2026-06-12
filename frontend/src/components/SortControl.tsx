import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { SortOption } from '@/hooks/useEventSorting';

interface SortControlProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  hasSearchQuery: boolean;
  hasUserLocation: boolean;
  compact?: boolean;
  className?: string;
}

const SortControl: React.FC<SortControlProps> = ({
  value,
  onChange,
  hasSearchQuery,
  hasUserLocation,
  compact = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 px-5 pb-2 ${className}`}>
      {compact ? (
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
      ) : (
        <label htmlFor="event-sort" className="text-xs font-medium text-muted-foreground shrink-0">
          Sort
        </label>
      )}
      <select
        id="event-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        aria-label="Sort events"
        className="flex-1 py-1.5 px-2 text-xs bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
      >
        <option value="date">Date</option>
        {hasUserLocation && <option value="distance">Distance</option>}
        {hasSearchQuery && <option value="relevance">Relevance</option>}
      </select>
    </div>
  );
};

export default React.memo(SortControl);
