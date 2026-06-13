import React from 'react';
import { EXAMPLE_SEARCHES } from '@/lib/discovery';

type DiscoveryVariant = 'onboarding' | 'empty' | 'inline';

interface DiscoverySuggestionsProps {
  variant?: DiscoveryVariant;
  onSelect: (query: string) => void;
}

const DiscoverySuggestions: React.FC<DiscoverySuggestionsProps> = ({
  variant = 'empty',
  onSelect,
}) => {
  const chipClass =
    variant === 'onboarding'
      ? 'px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium border border-border hover:border-primary/40 text-foreground'
      : 'px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-muted/50 hover:bg-muted text-foreground';

  return (
    <div className={`flex flex-wrap gap-2 ${variant === 'empty' ? 'justify-center' : ''}`}>
      {EXAMPLE_SEARCHES.map((q) => (
        <button key={q} type="button" onClick={() => onSelect(q)} className={chipClass}>
          {q}
        </button>
      ))}
    </div>
  );
};

export default React.memo(DiscoverySuggestions);
