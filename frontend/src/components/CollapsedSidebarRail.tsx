import React from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { AppTab } from './BottomNav';
import { APP_TABS, formatSavedBadgeCount } from '@/lib/appTabs';

export const COLLAPSED_RAIL_WIDTH = 56;

interface CollapsedSidebarRailProps {
  activeTab: AppTab;
  savedCount?: number;
  onTabChange: (tab: AppTab) => void;
  onExpand: () => void;
  onExpandAndFocusSearch: () => void;
}

const CollapsedSidebarRail: React.FC<CollapsedSidebarRailProps> = ({
  activeTab,
  savedCount = 0,
  onTabChange,
  onExpand,
  onExpandAndFocusSearch,
}) => {
  return (
    <aside
      className="relative shrink-0 h-full flex flex-col items-center border-r border-border bg-surface z-[1000] py-3 gap-1"
      style={{ width: COLLAPSED_RAIL_WIDTH }}
      aria-label="Collapsed sidebar"
    >
      <button
        type="button"
        onClick={onExpand}
        title="Expand sidebar"
        aria-label="Expand sidebar"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-primary hover:bg-muted transition-colors mb-1"
      >
        W
      </button>

      <nav className="flex flex-col items-center gap-1 flex-1" aria-label="Main navigation">
        {APP_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const badge =
            tab.showSavedBadge && savedCount > 0 ? formatSavedBadgeCount(savedCount) : null;

          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                active
                  ? 'bg-primary/15 text-primary border-l-2 border-primary rounded-l-none'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {badge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          title="Search events"
          aria-label="Search events"
          onClick={onExpandAndFocusSearch}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-1"
        >
          <Search className="w-4 h-4" aria-hidden />
        </button>
      </nav>

      <button
        type="button"
        title="Expand sidebar"
        aria-label="Expand sidebar"
        onClick={onExpand}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-auto"
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>
    </aside>
  );
};

export default React.memo(CollapsedSidebarRail);
