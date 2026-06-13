import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Drawer } from 'vaul';
import { Calendar, ChevronLeft, List, Loader2, Map as MapIcon } from 'lucide-react';
import CollapsedSidebarRail, { COLLAPSED_RAIL_WIDTH } from './CollapsedSidebarRail';
import { Event } from '@/types/Event';
import EventCardV2 from './EventCardV2';
import FilterChips from './FilterChips';
import { buildEmptyStateMessage } from '@/lib/filters';
import OnboardingBanner from './OnboardingBanner';
import PanelStatusBar from './PanelStatusBar';
import { usePanelStatus } from '@/hooks/usePanelStatus';
import SearchBar from './SearchBar';
import QuickShortcuts from './QuickShortcuts';
import { prefersReducedMotion } from '@/lib/motion';
import CollapsibleFilters from './CollapsibleFilters';
import EmptyState from './EmptyState';
import SearchResultsHeader from './SearchResultsHeader';
import AppBrand from './AppBrand';
import CategoryFilterDropdown from './CategoryFilterDropdown';
import EventSection from './EventSection';
import ProfilePanel from './ProfilePanel';
import TabHeader from './TabHeader';
import type { AppTab } from './BottomNav';
import type { UserLocation } from '@/lib/geo';
import type { AppTheme, MapAppearance } from '@/hooks/useAppPreferences';
import { countActiveFilters, hasActiveFilters, buildFilteredListTitle, type FilterState } from '@/lib/filters';
import type { SortOption } from '@/hooks/useEventSorting';
import type { PriceFilter } from '@/lib/price';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';
import { usePanelWidth } from '@/hooks/usePanelWidth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useEventSections } from '@/hooks/useEventSections';

export type SheetSnap = 'collapsed' | 'half' | 'full';

const LIST_ONLY_HINT_KEY = 'whatsupnyc_list_only_hint';
const SWIPE_HINT_KEY = 'whatsupnyc_swipe_hint_v1';

export interface EventsPanelHandle {
  scrollToEventId: (id: string) => void;
  scrollToTop: () => void;
  setSheetSnap: (snap: SheetSnap) => void;
  focusSearch: () => void;
}

interface EventsPanelProps {
  events: Event[];
  isLoading?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  selectedBorough: string;
  onBoroughChange: (borough: string) => void;
  selectedPrice: PriceFilter;
  onPriceChange: (price: PriceFilter) => void;
  selectedTimeOfDay: TimeOfDayFilter;
  onTimeOfDayChange: (time: TimeOfDayFilter) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onEventClick: (event: Event) => void;
  onShowOnMap?: (event: Event) => void;
  isMobile: boolean;
  savedEventIds: string[];
  isEventSaved: (eventId: string) => boolean;
  onToggleSave: (eventId: string) => void;
  searchLoading: boolean;
  dataSource: 'live' | 'demo';
  semanticFallback: boolean;
  semanticIndexing: boolean;
  ingesting?: boolean;
  degradedSources?: string[];
  liveTotalCount?: number;
  lastScrapeAt?: string | null;
  highlightedEventId?: string | null;
  userLocation?: UserLocation | null;
  showOnboarding?: boolean;
  onDismissOnboarding?: () => void;
  sheetSnap?: SheetSnap;
  onSheetSnapChange?: (snap: SheetSnap) => void;
  onClearAllFilters: () => void;
  onRemoveSearch: () => void;
  onRemoveCategory: () => void;
  onRemoveDate: () => void;
  onRemoveSaved: () => void;
  onRemoveBorough: () => void;
  onRemovePrice: () => void;
  onRemoveTimeOfDay: () => void;
  listOnlyMode?: boolean;
  onListOnlyModeChange?: (v: boolean) => void;
  onMapResize?: () => void;
  approximateLocationMessage?: string | null;
  recentSearches?: string[];
  onRecentSearchSelect?: (q: string) => void;
  onNearMe?: () => void;
  nearMeActive?: boolean;
  onRefresh?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSwipeSave?: (eventId: string) => void;
  hideMobileBrowsePill?: boolean;
  loadedCount?: number;
  catalogTotal?: number;
  isSearching?: boolean;
  searchTotalCount?: number;
  searchCapped?: boolean;
  searchLimit?: number;
  filteredEventCount?: number;
  showSearchCatalogNote?: boolean;
  loadMoreError?: string | null;
  onClearRecent?: () => void;
  savedHydrating?: boolean;
  mapEventCount?: number;
  savedHydrateError?: string | null;
  activeTab?: AppTab;
  appTheme?: AppTheme;
  onAppThemeChange?: (theme: AppTheme) => void;
  mapAppearance?: MapAppearance;
  onMapAppearanceChange?: (appearance: MapAppearance) => void;
  is3D?: boolean;
  onIs3DChange?: (v: boolean) => void;
  onOpenShortcuts?: () => void;
  showBottomNavPadding?: boolean;
  onTabChange?: (tab: AppTab) => void;
}

const SNAP_HEIGHTS: Record<SheetSnap, string> = {
  collapsed: '80px',
  half: '50vh',
  full: 'min(90vh, calc(100vh - env(safe-area-inset-top)))',
};

const EventsPanel = forwardRef<EventsPanelHandle, EventsPanelProps>(function EventsPanel(
  {
    events,
    isLoading = false,
    isExpanded,
    onToggleExpand,
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    selectedDateRange,
    onDateRangeChange,
    selectedBorough,
    onBoroughChange,
    selectedPrice,
    onPriceChange,
    selectedTimeOfDay,
    onTimeOfDayChange,
    sort,
    onSortChange,
    onEventClick,
    onShowOnMap,
    isMobile,
    isEventSaved,
    onToggleSave,
    searchLoading,
    dataSource,
    semanticFallback,
    semanticIndexing,
    ingesting = false,
    degradedSources = [],
    liveTotalCount,
    lastScrapeAt,
    highlightedEventId,
    userLocation,
    showOnboarding = false,
    onDismissOnboarding,
    sheetSnap = 'half',
    onSheetSnapChange,
    onClearAllFilters,
    onRemoveSearch,
    onRemoveCategory,
    onRemoveDate,
    onRemoveSaved,
    onRemoveBorough,
    onRemovePrice,
    onRemoveTimeOfDay,
    listOnlyMode = false,
    onListOnlyModeChange,
    onMapResize,
    savedEventIds,
    approximateLocationMessage,
    recentSearches = [],
    onRecentSearchSelect,
    onNearMe,
    nearMeActive = false,
    onRefresh,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    onSwipeSave,
    hideMobileBrowsePill = false,
    loadedCount,
    catalogTotal,
    isSearching = false,
    searchTotalCount,
    searchCapped = false,
    searchLimit = 50,
    filteredEventCount,
    showSearchCatalogNote = false,
    loadMoreError,
    onClearRecent,
    savedHydrating = false,
    mapEventCount = 0,
    savedHydrateError,
    activeTab = 'discover',
    appTheme = 'light',
    onAppThemeChange,
    mapAppearance = 'light',
    onMapAppearanceChange,
    is3D = true,
    onIs3DChange,
    onOpenShortcuts,
    showBottomNavPadding = false,
    onTabChange,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [browseFlatExpanded, setBrowseFlatExpanded] = useState(false);
  const [listOnlyHint, setListOnlyHint] = useState<string | null>(null);
  const [swipeHintVisible, setSwipeHintVisible] = useState(false);
  const [activeBrowseSection, setActiveBrowseSection] = useState<'tonight' | 'weekend' | null>(
    null
  );

  const { width: panelWidth, onResizePointerDown, onResizePointerMove, onResizePointerUp } =
    usePanelWidth(!isMobile && isExpanded);

  const filterState: FilterState = {
    searchQuery,
    selectedCategory,
    selectedDateRange,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay,
    showSavedOnly: selectedCategory === 'saved',
  };

  const activeFilterCount = countActiveFilters({
    ...filterState,
    searchQuery: '',
  });

  const panelStatus = usePanelStatus({
    ingesting,
    semanticFallback,
    semanticIndexing,
    searchQuery,
    approximateLocationMessage,
    savedHydrateError,
    savedHydrating,
    mapEventCount,
  });

  useEffect(() => {
    if (!isMobile || !onSwipeSave || prefersReducedMotion()) return;
    try {
      if (localStorage.getItem(SWIPE_HINT_KEY) !== '1') {
        setSwipeHintVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, [isMobile, onSwipeSave]);

  const activeTabResolved = activeTab ?? 'discover';

  const hideApproxOnCards = Boolean(
    approximateLocationMessage && panelStatus.status === 'approximate'
  );

  useEffect(() => {
    if (!onListOnlyModeChange) return;
    try {
      if (localStorage.getItem(LIST_ONLY_HINT_KEY) === '1') return;
      setListOnlyHint('Toggle between map and list-only view');
      localStorage.setItem(LIST_ONLY_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, [onListOnlyModeChange]);

  const isBrowseMode =
    activeTab === 'discover' &&
    !browseFlatExpanded &&
    !isSearching &&
    selectedDateRange === 'all' &&
    selectedBorough === 'all' &&
    selectedPrice === 'all' &&
    selectedTimeOfDay === 'all' &&
    selectedCategory === 'all';

  const showFilterChips = hasActiveFilters(filterState) && activeTab !== 'profile';
  const sections = useEventSections(isBrowseMode ? events : []);
  const useVirtual = !isBrowseMode && events.length > 30;

  const filteredListTitle =
    !isBrowseMode && hasActiveFilters(filterState) && !isSearching
      ? buildFilteredListTitle(filterState, events.length)
      : null;

  useEffect(() => {
    if (!isBrowseMode || activeTabResolved !== 'discover' || isLoading) {
      setActiveBrowseSection(null);
      return;
    }

    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const sections = ['tonight', 'weekend'] as const;
    const observed = sections
      .map((id) => root.querySelector(`#event-section-${id}`))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    if (observed.length === 0) {
      setActiveBrowseSection(null);
      return;
    }

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id.replace('event-section-', '');
          ratios.set(id, entry.intersectionRatio);
        });

        let best: 'tonight' | 'weekend' | null = null;
        let bestRatio = 0.3;
        for (const id of sections) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        setActiveBrowseSection(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isBrowseMode, activeTabResolved, isLoading, events.length]);

  useEffect(() => {
    setBrowseFlatExpanded(false);
    setActiveBrowseSection(null);
  }, [
    activeTab,
    searchQuery,
    selectedCategory,
    selectedDateRange,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay,
  ]);

  useEffect(() => {
    let width = '0px';
    if (!isMobile && !listOnlyMode) {
      width = isExpanded ? `${panelWidth}px` : `${COLLAPSED_RAIL_WIDTH}px`;
    }
    document.documentElement.style.setProperty('--panel-width', width);
  }, [panelWidth, isMobile, isExpanded, listOnlyMode]);

  const virtualizer = useVirtualizer({
    count: isLoading ? 0 : events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 5,
    enabled: useVirtual,
  });

  const pullRefresh = usePullToRefresh({
    enabled: isMobile && Boolean(onRefresh),
    onRefresh: () => onRefresh?.(),
  });

  const scrollToEventId = useCallback(
    (id: string) => {
      const idx = events.findIndex((e) => e.id === id);
      if (idx < 0) return;
      if (useVirtual) {
        virtualizer.scrollToIndex(idx, { align: 'center' });
      } else {
        scrollRef.current
          ?.querySelector(`[data-event-id="${id}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
    [events, virtualizer, useVirtual]
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const setSheetSnap = useCallback(
    (snap: SheetSnap) => {
      onSheetSnapChange?.(snap);
      onMapResize?.();
    },
    [onSheetSnapChange, onMapResize]
  );

  useImperativeHandle(ref, () => ({ scrollToEventId, scrollToTop, setSheetSnap, focusSearch }), [
    scrollToEventId,
    scrollToTop,
    setSheetSnap,
    focusSearch,
  ]);

  useEffect(() => {
    onMapResize?.();
  }, [isExpanded, sheetSnap, listOnlyMode, panelWidth, onMapResize]);

  const handleExampleSearch = (q: string) => {
    onSearchChange(q);
    searchInputRef.current?.focus();
  };

  const handleViewAllSection = (when: 'today' | 'weekend') => {
    scrollToTop();
    onDateRangeChange(when);
  };

  const handleViewAllComingUp = () => {
    setBrowseFlatExpanded(true);
    scrollToTop();
  };

  const handleBrowseWeekend = () => {
    handleViewAllSection('weekend');
  };

  const handleExpandAndFocusSearch = useCallback(() => {
    if (!isExpanded) onToggleExpand();
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [isExpanded, onToggleExpand]);

  const handleRailTabChange = useCallback(
    (tab: AppTab) => {
      if (!isExpanded && (tab === 'saved' || tab === 'profile')) {
        onToggleExpand();
      }
      onTabChange?.(tab);
    },
    [isExpanded, onToggleExpand, onTabChange]
  );

  const scrollToEventSection = useCallback(
    (sectionId: 'tonight' | 'weekend') => {
      const target = scrollRef.current?.querySelector(`#event-section-${sectionId}`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      scrollToTop();
      onDateRangeChange(sectionId === 'tonight' ? 'today' : 'weekend');
    },
    [onDateRangeChange, scrollToTop]
  );

  const panelHeader = (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-start justify-between gap-2">
        <AppBrand
          shownCount={events.length}
          catalogTotal={liveTotalCount ?? catalogTotal}
          dataSource={dataSource}
          ingesting={ingesting}
          degradedSources={degradedSources}
          lastScrapeAt={lastScrapeAt}
          mapEventCount={mapEventCount}
          listOnlyMode={listOnlyMode}
          activeTab={activeTabResolved}
          onTabChange={onTabChange}
          savedCount={savedEventIds.length}
          showDesktopTabs={!isMobile}
        />
        <div className="flex items-center gap-2 px-5 pt-4 shrink-0">
          {onListOnlyModeChange && !isMobile && (
            <button
              type="button"
              aria-label={listOnlyMode ? 'Show map' : 'Full-width list'}
              onClick={() => onListOnlyModeChange(!listOnlyMode)}
              title={listOnlyHint ?? (listOnlyMode ? 'Show map' : 'Full-width list')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                listOnlyMode ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {listOnlyMode ? (
                <MapIcon className="w-4 h-4" aria-hidden />
              ) : (
                <List className="w-4 h-4" aria-hidden />
              )}
            </button>
          )}
          {!isMobile && !listOnlyMode && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-xl bg-muted border-none cursor-pointer flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const stickySearchZone =
    activeTabResolved === 'profile' ? null : (
      <div className="shrink-0 border-b border-border" data-testid="sticky-zone">
        {activeTabResolved === 'saved' && (
          <div className="px-5 pt-2">
            <TabHeader activeTab={activeTabResolved} savedCount={savedEventIds.length} sort={sort} />
          </div>
        )}
        <SearchBar
          ref={searchInputRef}
          value={searchQuery}
          onChange={onSearchChange}
          searchLoading={searchLoading}
          recentSearches={recentSearches}
          onRecentSelect={onRecentSearchSelect}
          searchFocused={searchFocused}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
          onClearRecent={onClearRecent}
          onFilterClick={() => setFilterSheetOpen(true)}
          filterActiveCount={activeFilterCount}
        />
        {activeTabResolved === 'discover' && (
          <div className="flex gap-1.5 px-5 pb-2 overflow-x-auto category-scroll shrink-0 items-center">
            <QuickShortcuts
              isMobile={isMobile}
              selectedDateRange={selectedDateRange}
              onDateRangeChange={onDateRangeChange}
              browseMode={isBrowseMode}
              onScrollToSection={scrollToEventSection}
              activeBrowseSection={activeBrowseSection}
              onMoreClick={() => setFilterSheetOpen(true)}
              moreActive={activeFilterCount > 0}
            />
            <CategoryFilterDropdown
              selectedCategory={selectedCategory === 'saved' ? 'all' : selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          </div>
        )}
        <CollapsibleFilters
          filterSheetOpen={filterSheetOpen}
          onFilterSheetOpenChange={setFilterSheetOpen}
          activeCount={activeFilterCount}
          sort={sort}
          onSortChange={onSortChange}
          hasSearchQuery={searchQuery.trim().length >= 2}
          hasUserLocation={userLocation != null}
          selectedBorough={selectedBorough}
          onBoroughChange={onBoroughChange}
          selectedCategory={selectedCategory === 'saved' ? 'all' : selectedCategory}
          onCategoryChange={onCategoryChange}
          savedMode={selectedCategory === 'saved'}
          selectedTimeOfDay={selectedTimeOfDay}
          onTimeOfDayChange={onTimeOfDayChange}
          selectedDateRange={selectedDateRange}
          onDateRangeChange={onDateRangeChange}
          selectedPrice={selectedPrice}
          onPriceChange={onPriceChange}
          onNearMe={onNearMe}
          nearMeActive={nearMeActive}
        />
        {showFilterChips && (
          <FilterChips
            filters={filterState}
            onClearAll={onClearAllFilters}
            onRemoveSearch={onRemoveSearch}
            onRemoveCategory={onRemoveCategory}
            onRemoveDate={onRemoveDate}
            onRemoveSaved={onRemoveSaved}
            onRemoveBorough={onRemoveBorough}
            onRemovePrice={onRemovePrice}
            onRemoveTimeOfDay={onRemoveTimeOfDay}
          />
        )}
      </div>
    );

  const scrollContent = (
    <div
      id="panel-scroll"
      ref={scrollRef}
      data-testid="panel-scroll"
      tabIndex={-1}
      className="flex-1 min-h-0 overflow-y-auto outline-none"
      onTouchStart={pullRefresh.onTouchStart}
      onTouchEnd={pullRefresh.onTouchEnd}
    >
      {isMobile && pullRefresh.isRefreshing && (
        <div
          className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Refreshing…
        </div>
      )}
      {activeTabResolved === 'profile' ? (
        <ProfilePanel
          appTheme={appTheme}
          onAppThemeChange={onAppThemeChange ?? (() => {})}
          mapAppearance={mapAppearance}
          onMapAppearanceChange={onMapAppearanceChange ?? (() => {})}
          is3D={is3D}
          onIs3DChange={onIs3DChange ?? (() => {})}
          onOpenShortcuts={onOpenShortcuts}
        />
      ) : (
        <div className="px-5 pb-5">
          {showOnboarding && onDismissOnboarding && (
            <OnboardingBanner
              onDismiss={onDismissOnboarding}
              onExampleSearch={handleExampleSearch}
              isMobile={isMobile}
            />
          )}

          <PanelStatusBar
            status={panelStatus.status}
            message={panelStatus.message}
            onDismiss={panelStatus.dismiss}
          />

          <SearchResultsHeader
            searchQuery={searchQuery}
            eventsCount={
              isSearching && searchTotalCount != null ? searchTotalCount : events.length
            }
            filteredCount={filteredEventCount ?? events.length}
            searchLoading={searchLoading}
            isSearching={isSearching}
            searchTotalCount={searchTotalCount}
            searchCapped={searchCapped}
            searchLimit={searchLimit}
            sort={sort}
            showSearchCatalogNote={showSearchCatalogNote}
          />

          {filteredListTitle && (
            <h2 className="text-sm font-bold text-foreground mb-2">{filteredListTitle}</h2>
          )}

          {swipeHintVisible && onSwipeSave && (
            <div className="mb-2 p-2.5 rounded-card bg-muted/80 text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span>Swipe right on a card to save</span>
              <button
                type="button"
                className="text-xs font-semibold underline shrink-0"
                onClick={() => {
                  setSwipeHintVisible(false);
                  try {
                    localStorage.setItem(SWIPE_HINT_KEY, '1');
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Got it
              </button>
            </div>
          )}

          {isLoading || (searchLoading && events.length === 0) ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="animate-pulse flex gap-3 p-3 mb-2 bg-surface-elevated rounded-xl border border-border"
            >
              <div className="w-[88px] h-[72px] bg-muted rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          activeTabResolved === 'saved' ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                No saved events yet. Tap the heart on events you want to keep.
              </p>
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange('discover')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
                >
                  Browse events
                </button>
              )}
            </div>
          ) : (
            <EmptyState
              message={buildEmptyStateMessage(filterState, {
                savedCount: savedEventIds.length,
                savedHydrating,
              })}
              onSuggestionClick={onSearchChange}
              hasActiveFilters={hasActiveFilters(filterState)}
              onClearFilters={onClearAllFilters}
              onLoadMore={
                hasActiveFilters(filterState) && hasMore && onLoadMore ? onLoadMore : undefined
              }
              isLoadingMore={isLoadingMore}
            />
          )
        ) : isBrowseMode && sections.length > 0 ? (
          <>
            {sections.map((section) => (
              <EventSection
                key={section.id}
                section={section}
                onViewAll={handleViewAllSection}
                onViewAllComingUp={handleViewAllComingUp}
                onBrowseWeekend={handleBrowseWeekend}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                isEventSaved={isEventSaved}
                onToggleSave={onToggleSave}
                onEventClick={onEventClick}
                onShowOnMap={onShowOnMap}
                highlightedEventId={highlightedEventId}
                userLocation={userLocation}
                isMobile={isMobile}
                onSwipeSave={onSwipeSave}
                hideApproxBadge={hideApproxOnCards}
              />
            ))}
          </>
        ) : useVirtual ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const event = events[virtualRow.index];
              return (
                <div
                  key={event.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <EventCardV2
                    event={event}
                    isSaved={isEventSaved(event.id)}
                    isHighlighted={highlightedEventId === event.id}
                    onToggleSave={onToggleSave}
                    onClick={onEventClick}
                    onShowOnMap={onShowOnMap}
                    userLocation={userLocation}
                    isMobile={isMobile}
                    hideApproxBadge={hideApproxOnCards}
                    onSwipeSave={onSwipeSave}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          events.map((event) => (
            <EventCardV2
              key={event.id}
              event={event}
              isSaved={isEventSaved(event.id)}
              isHighlighted={highlightedEventId === event.id}
              onToggleSave={onToggleSave}
              onClick={onEventClick}
              onShowOnMap={onShowOnMap}
              userLocation={userLocation}
              isMobile={isMobile}
              hideApproxBadge={hideApproxOnCards}
              onSwipeSave={onSwipeSave}
            />
          ))
        )}
        {loadMoreError && (
          <div
            role="alert"
            className="mt-2 p-3 rounded-card bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2"
          >
            <span>{loadMoreError}</span>
            {onLoadMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className="font-semibold underline shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {hasMore && onLoadMore && !isLoading && events.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {(hasActiveFilters(filterState) || isBrowseMode) &&
              loadedCount != null &&
              catalogTotal != null && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing {events.length} loaded · {catalogTotal} in catalog
                </p>
              )}
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full py-3 rounded-card bg-muted text-foreground text-body-sm font-semibold hover:bg-muted/80 disabled:opacity-60"
            >
              {isLoadingMore
                ? 'Loading…'
                : hasActiveFilters(filterState)
                  ? 'Load more into catalog'
                  : 'Load more events'}
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );

  const panelBody = (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden bg-surface">
      {panelHeader}
      {stickySearchZone}
      {scrollContent}
    </div>
  );

  const bottomPad = showBottomNavPadding ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : '';

  if (listOnlyMode) {
    return (
      <div
        className={`absolute inset-0 z-[1000] flex flex-col min-h-0 overflow-hidden bg-surface ${bottomPad}`}
      >
        {panelBody}
      </div>
    );
  }

  if (isMobile) {
    const open = sheetSnap !== 'collapsed';
    return (
      <Drawer.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) setSheetSnap('collapsed');
          else if (sheetSnap === 'collapsed') setSheetSnap('half');
        }}
        snapPoints={['80px', 0.5, 0.9]}
        activeSnapPoint={sheetSnap === 'collapsed' ? '80px' : sheetSnap === 'half' ? 0.5 : 0.9}
        setActiveSnapPoint={(point) => {
          if (point === '80px' || point === 80) setSheetSnap('collapsed');
          else if (point === 0.5) setSheetSnap('half');
          else setSheetSnap('full');
        }}
        modal={false}
      >
        <Drawer.Portal>
          <Drawer.Content
            className={`fixed bottom-0 left-0 right-0 z-[1000] flex flex-col min-h-0 overflow-hidden rounded-t-3xl bg-surface border border-border shadow-2xl ${bottomPad}`}
            style={{ maxHeight: SNAP_HEIGHTS.full }}
          >
            <Drawer.Handle className="mx-auto mt-3 mb-0 shrink-0" />
            <Drawer.Title className="sr-only">Events panel</Drawer.Title>
            <Drawer.Description className="sr-only">
              Browse and filter NYC events. Swipe up to expand.
            </Drawer.Description>
            {sheetSnap === 'half' && (
              <p className="text-center text-[10px] text-muted-foreground pb-1 shrink-0">
                Swipe up for more
              </p>
            )}
            {panelBody}
          </Drawer.Content>
        </Drawer.Portal>
        {sheetSnap === 'collapsed' && !hideMobileBrowsePill && activeTab === 'discover' && (
          <button
            type="button"
            onClick={() => setSheetSnap('half')}
            aria-label="Expand events panel"
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" aria-hidden />
            Browse events · {events.length}
          </button>
        )}
      </Drawer.Root>
    );
  }

  if (!isExpanded) {
    return (
      <CollapsedSidebarRail
        activeTab={activeTabResolved}
        savedCount={savedEventIds.length}
        onTabChange={handleRailTabChange}
        onExpand={onToggleExpand}
        onExpandAndFocusSearch={handleExpandAndFocusSearch}
      />
    );
  }

  const widthTransition = prefersReducedMotion() ? '' : 'transition-[width] duration-300 ease-out';

  return (
    <aside
      className={`relative shrink-0 h-full flex flex-col min-h-0 bg-surface border-r border-border z-[1000] ${widthTransition}`}
      style={{ width: panelWidth }}
    >
      {panelBody}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/20 touch-none"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
      />
    </aside>
  );
});

export default EventsPanel;
