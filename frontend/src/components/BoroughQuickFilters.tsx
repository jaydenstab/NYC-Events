import React from 'react';

const QUICK_BOROUGHS = ['all', 'Manhattan', 'Brooklyn', 'Queens'] as const;

interface BoroughQuickFiltersProps {
  selected: string;
  onChange: (borough: string) => void;
}

const BoroughQuickFilters: React.FC<BoroughQuickFiltersProps> = ({ selected, onChange }) => {
  return (
    <div
      className="flex gap-1.5 px-5 pb-2 overflow-x-auto category-scroll shrink-0"
      aria-label="Borough quick filters"
    >
      {QUICK_BOROUGHS.map((borough) => {
        const isSelected = selected === borough;
        return (
          <button
            key={borough}
            type="button"
            onClick={() => onChange(borough)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {borough === 'all' ? 'All' : borough}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(BoroughQuickFilters);
