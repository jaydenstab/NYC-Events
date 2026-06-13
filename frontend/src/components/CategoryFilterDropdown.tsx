import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { categories } from '@/types/Event';

interface CategoryFilterDropdownProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  disabled?: boolean;
}

function labelForCategory(cat: string): string {
  if (cat === 'all') return 'All categories';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  selectedCategory,
  onCategoryChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = selectedCategory !== 'all' && selectedCategory !== 'saved';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const chipClass = active
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-border bg-surface-elevated text-foreground hover:border-primary/40';

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${chipClass}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {labelForCategory(selectedCategory === 'saved' ? 'all' : selectedCategory)}
        <ChevronDown className="w-3 h-3" aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-40 bg-surface-elevated border border-border rounded-xl shadow-xl py-1 min-w-[160px] max-h-[240px] overflow-y-auto"
        >
          {categories
            .filter((c) => c !== 'saved')
            .map((cat) => (
              <button
                key={cat}
                type="button"
                role="option"
                aria-selected={selectedCategory === cat}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted ${
                  selectedCategory === cat ? 'text-primary' : 'text-foreground'
                }`}
                onClick={() => {
                  onCategoryChange(cat);
                  setOpen(false);
                }}
              >
                {labelForCategory(cat)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(CategoryFilterDropdown);
