import React from 'react';

const BOROUGHS = ['all', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] as const;

interface BoroughFiltersProps {
  selected: string;
  onChange: (borough: string) => void;
}

const BoroughFilters: React.FC<BoroughFiltersProps> = ({ selected, onChange }) => {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by borough"
      className="flex gap-1.5 px-5 pb-2 overflow-x-auto category-scroll min-h-[40px] items-center"
    >
      {BOROUGHS.map((borough) => {
        const isSelected = selected === borough;
        return (
          <button
            key={borough}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(borough)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-black/5 dark:border-white/10 bg-card text-muted-foreground'
            }`}
          >
            {borough === 'all' ? 'All boroughs' : borough}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(BoroughFilters);
