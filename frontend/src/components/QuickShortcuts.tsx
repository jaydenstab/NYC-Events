import React from 'react';
import { Moon, CalendarDays } from 'lucide-react';

interface QuickShortcutsProps {
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  browseMode?: boolean;
  onScrollToSection?: (section: 'tonight' | 'weekend') => void;
  activeBrowseSection?: 'tonight' | 'weekend' | null;
  isMobile?: boolean;
  onMoreClick?: () => void;
  moreActive?: boolean;
}

const QuickShortcuts: React.FC<QuickShortcutsProps> = ({
  selectedDateRange,
  onDateRangeChange,
  browseMode = false,
  onScrollToSection,
  activeBrowseSection = null,
  isMobile = false,
  onMoreClick,
  moreActive = false,
}) => {
  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-surface-elevated text-foreground hover:border-primary/40'
    }`;

  const toggleDate = (range: 'today' | 'weekend') => {
    if (browseMode && onScrollToSection) {
      onScrollToSection(range === 'today' ? 'tonight' : 'weekend');
      return;
    }
    onDateRangeChange(selectedDateRange === range ? 'all' : range);
  };

  return (
    <div
      className="flex gap-1.5 shrink-0 items-center"
      aria-label="Quick filters"
    >
      <button
        type="button"
        className={chipClass(
          selectedDateRange === 'today' ||
            (browseMode && activeBrowseSection === 'tonight')
        )}
        onClick={() => toggleDate('today')}
      >
        <Moon className="w-3 h-3" aria-hidden />
        Tonight
      </button>
      <button
        type="button"
        className={chipClass(
          selectedDateRange === 'weekend' ||
            (browseMode && activeBrowseSection === 'weekend')
        )}
        onClick={() => toggleDate('weekend')}
      >
        <CalendarDays className="w-3 h-3" aria-hidden />
        This weekend
      </button>
      {isMobile && onMoreClick && (
        <button type="button" className={chipClass(moreActive)} onClick={onMoreClick}>
          More
        </button>
      )}
    </div>
  );
};

export default React.memo(QuickShortcuts);
