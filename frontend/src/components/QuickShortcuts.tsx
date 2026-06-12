import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, CalendarDays, CalendarRange, BadgeDollarSign, Locate, ChevronDown } from 'lucide-react';
import type { PriceFilter } from '@/lib/price';

interface QuickShortcutsProps {
  selectedDateRange: string;
  selectedPrice: PriceFilter;
  onDateRangeChange: (range: string) => void;
  onPriceChange: (price: PriceFilter) => void;
  onNearMe: () => void;
  nearMeActive?: boolean;
  isMobile?: boolean;
}

const QuickShortcuts: React.FC<QuickShortcutsProps> = ({
  selectedDateRange,
  selectedPrice,
  onDateRangeChange,
  onPriceChange,
  onNearMe,
  nearMeActive = false,
  isMobile = false,
}) => {
  const [datesOpen, setDatesOpen] = useState(false);
  const datesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!datesOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (datesRef.current && !datesRef.current.contains(e.target as Node)) {
        setDatesOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [datesOpen]);

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground'
    }`;

  const toggleDate = (range: string) => {
    onDateRangeChange(selectedDateRange === range ? 'all' : range);
    setDatesOpen(false);
  };

  const extraDateActive = selectedDateRange === 'tomorrow' || selectedDateRange === 'week';

  if (isMobile) {
    return (
      <div
        className="flex gap-1.5 px-5 pb-2 overflow-x-auto category-scroll shrink-0"
        aria-label="Quick filters"
      >
        <button type="button" className={chipClass(selectedDateRange === 'today')} onClick={() => toggleDate('today')}>
          <Moon className="w-3 h-3" aria-hidden />
          Tonight
        </button>
        <button type="button" className={chipClass(selectedDateRange === 'weekend')} onClick={() => toggleDate('weekend')}>
          <CalendarDays className="w-3 h-3" aria-hidden />
          This weekend
        </button>
        <div className="relative shrink-0" ref={datesRef}>
          <button
            type="button"
            className={chipClass(extraDateActive || datesOpen)}
            onClick={() => setDatesOpen((v) => !v)}
            aria-expanded={datesOpen}
            aria-haspopup="menu"
          >
            Dates
            <ChevronDown className="w-3 h-3" aria-hidden />
          </button>
          {datesOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted flex items-center gap-2"
                onClick={() => toggleDate('tomorrow')}
              >
                <Sun className="w-3 h-3" aria-hidden />
                Tomorrow
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted flex items-center gap-2"
                onClick={() => toggleDate('week')}
              >
                <CalendarRange className="w-3 h-3" aria-hidden />
                This week
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={chipClass(selectedPrice === 'free')}
          onClick={() => onPriceChange(selectedPrice === 'free' ? 'all' : 'free')}
        >
          <BadgeDollarSign className="w-3 h-3" aria-hidden />
          Free
        </button>
        <button type="button" className={chipClass(nearMeActive)} onClick={onNearMe}>
          <Locate className="w-3 h-3" aria-hidden />
          Near me
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex gap-1.5 px-5 pb-2 overflow-x-auto category-scroll shrink-0"
      aria-label="Quick filters"
    >
      <button type="button" className={chipClass(selectedDateRange === 'today')} onClick={() => toggleDate('today')}>
        <Moon className="w-3 h-3" aria-hidden />
        Tonight
      </button>
      <button type="button" className={chipClass(selectedDateRange === 'tomorrow')} onClick={() => toggleDate('tomorrow')}>
        <Sun className="w-3 h-3" aria-hidden />
        Tomorrow
      </button>
      <button type="button" className={chipClass(selectedDateRange === 'weekend')} onClick={() => toggleDate('weekend')}>
        <CalendarDays className="w-3 h-3" aria-hidden />
        This weekend
      </button>
      <button type="button" className={chipClass(selectedDateRange === 'week')} onClick={() => toggleDate('week')}>
        <CalendarRange className="w-3 h-3" aria-hidden />
        This week
      </button>
      <button
        type="button"
        className={chipClass(selectedPrice === 'free')}
        onClick={() => onPriceChange(selectedPrice === 'free' ? 'all' : 'free')}
      >
        <BadgeDollarSign className="w-3 h-3" aria-hidden />
        Free
      </button>
      <button type="button" className={chipClass(nearMeActive)} onClick={onNearMe}>
        <Locate className="w-3 h-3" aria-hidden />
        Near me
      </button>
    </div>
  );
};

export default React.memo(QuickShortcuts);
