import React from 'react';
import type { AppTab } from './BottomNav';
import { APP_TABS, formatSavedBadgeCount } from '@/lib/appTabs';

interface DesktopTabBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  savedCount?: number;
  embedded?: boolean;
}

const DesktopTabBar: React.FC<DesktopTabBarProps> = ({
  activeTab,
  onTabChange,
  savedCount = 0,
  embedded = false,
}) => {
  const tabClass = (tab: AppTab) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
      activeTab === tab
        ? 'bg-primary text-primary-foreground'
        : 'bg-surface-elevated text-muted-foreground hover:text-foreground border border-border'
    }`;

  return (
    <nav
      className={
        embedded
          ? 'hidden md:flex gap-1 mt-2 flex-wrap'
          : 'hidden md:flex gap-1.5 px-5 pb-2 shrink-0'
      }
      aria-label="Main navigation"
    >
      {APP_TABS.map((tab) => {
        const Icon = tab.icon;
        const badge =
          tab.showSavedBadge && savedCount > 0 ? formatSavedBadgeCount(savedCount) : null;

        return (
          <button
            key={tab.id}
            type="button"
            className={tabClass(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {tab.label}
            {badge && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default React.memo(DesktopTabBar);
