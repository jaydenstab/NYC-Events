import React from 'react';
import IngestBadge from './IngestBadge';
import SourcesPopover from './SourcesPopover';
import DesktopTabBar from './DesktopTabBar';
import { formatRelativeTime } from '@/lib/dateFormat';
import type { AppTab } from './BottomNav';

interface AppBrandProps {
  shownCount: number;
  catalogTotal?: number;
  dataSource: 'live' | 'demo';
  ingesting?: boolean;
  degradedSources?: string[];
  lastScrapeAt?: string | null;
  mapEventCount?: number;
  listOnlyMode?: boolean;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
  savedCount?: number;
  showDesktopTabs?: boolean;
}

const AppBrand: React.FC<AppBrandProps> = ({
  shownCount,
  catalogTotal,
  dataSource,
  ingesting = false,
  degradedSources = [],
  lastScrapeAt,
  mapEventCount,
  listOnlyMode = false,
  activeTab = 'discover',
  onTabChange,
  savedCount = 0,
  showDesktopTabs = false,
}) => {
  const updatedLabel = formatRelativeTime(lastScrapeAt);

  return (
    <div className="px-5 pt-4 pb-2 shrink-0 min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            WhatsUp<span className="text-primary">NYC</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px]">
            Find exciting events happening in New York City.
          </p>
        </div>
        <IngestBadge active={Boolean(ingesting)} degradedSources={degradedSources} />
      </div>
      {showDesktopTabs && onTabChange && (
        <DesktopTabBar
          activeTab={activeTab}
          onTabChange={onTabChange}
          savedCount={savedCount}
          embedded
        />
      )}
      <p className="text-[11px] text-muted-foreground mt-2 flex flex-wrap items-center gap-x-1" aria-live="polite">
        <span>
          {shownCount} shown
          {dataSource === 'demo' && ' · sample events'}
        </span>
        {updatedLabel && (
          <SourcesPopover
            updatedLabel={updatedLabel}
            degradedSources={degradedSources}
            shownCount={shownCount}
            catalogTotal={catalogTotal}
            mapEventCount={mapEventCount}
            listOnlyMode={listOnlyMode}
            dataSource={dataSource}
          />
        )}
      </p>
    </div>
  );
};

export default React.memo(AppBrand);
