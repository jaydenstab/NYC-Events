import React, { useState, useRef, useEffect } from 'react';
import { categoryConfig } from '@/types/Event';
import { getCategoryIcon, PRIMARY_CATEGORIES, MORE_CATEGORIES } from '@/lib/categoryIcons';
import { ChevronDown } from 'lucide-react';

interface CategoryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  savedMode?: boolean;
}

function CategoryButton({
  cat,
  isSelected,
  onClick,
}: {
  cat: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = categoryConfig[cat] || categoryConfig.other;
  const Icon = getCategoryIcon(cat);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onClick}
      className={`px-3 py-2 rounded-full border-none cursor-pointer text-[13px] font-semibold flex items-center gap-1.5 shrink-0 transition-all duration-300 ${
        isSelected
          ? 'text-white ring-2 ring-primary/40'
          : 'bg-muted/50 text-foreground'
      }`}
      style={
        isSelected
          ? {
              background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
              boxShadow: `0 4px 12px ${config.color}40`,
            }
          : undefined
      }
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      <span className="capitalize">{cat}</span>
    </button>
  );
}

const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  savedMode = false,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isMoreSelected = MORE_CATEGORIES.includes(
    selectedCategory as (typeof MORE_CATEGORIES)[number]
  );

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  const handleKeyDown = (e: React.KeyboardEvent, cats: readonly string[], current: string) => {
    const idx = cats.indexOf(current);
    if (e.key === 'ArrowRight' && idx < cats.length - 1) {
      onCategoryChange(cats[idx + 1]);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      onCategoryChange(cats[idx - 1]);
    }
  };

  return (
    <div className="pb-4 shrink-0">
      {savedMode && (
        <p className="text-xs text-muted-foreground mb-2">Browsing saved events.</p>
      )}
      <div
        role="radiogroup"
        aria-label="Filter by category"
        aria-disabled={savedMode}
        className={`flex gap-2 overflow-x-auto whitespace-nowrap category-scroll min-h-[40px] items-center ${
          savedMode ? 'opacity-50 pointer-events-none' : ''
        }`}
        onKeyDown={(e) => handleKeyDown(e, PRIMARY_CATEGORIES, selectedCategory)}
      >
        {PRIMARY_CATEGORIES.map((cat) => (
          <CategoryButton
            key={cat}
            cat={cat}
            isSelected={selectedCategory === cat}
            onClick={() => onCategoryChange(cat)}
          />
        ))}
        <div className="relative shrink-0" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`px-3 py-2 rounded-full border-none cursor-pointer text-[13px] font-semibold flex items-center gap-1 shrink-0 ${
              isMoreSelected
                ? 'text-white bg-primary'
                : 'bg-muted/50 text-foreground'
            }`}
          >
            More
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreOpen && (
            <div className="absolute top-full mt-2 right-0 z-50 min-w-[180px] p-2 rounded-xl bg-surface-elevated border border-border shadow-xl flex flex-col gap-1">
              {MORE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onCategoryChange(cat);
                    setMoreOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-sm font-medium capitalize ${
                    selectedCategory === cat ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CategoryFilters);
