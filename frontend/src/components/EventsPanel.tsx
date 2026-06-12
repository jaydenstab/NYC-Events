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
import { Calendar, ChevronLeft, Heart, List, Loader2, Map } from 'lucide-react';
import { Event } from '@/types/Event';
import EventCard from './EventCard';
import IngestBadge from './IngestBadge';
import FilterChips from './FilterChips';
import { buildEmptyStateMessage } from '@/lib/filters';
import OnboardingBanner from './OnboardingBanner';
import PanelStatusBar from './PanelStatusBar';
import { usePanelStatus } from '@/hooks/usePanelStatus';
import SearchBar from './SearchBar';
import QuickShortcuts from './QuickShortcuts';
import BoroughQuickFilters from './BoroughQuickFilters';
import { prefersReducedMotion } from '@/lib/motion';
import CollapsibleFilters from './CollapsibleFilters';
import EmptyState from './EmptyState';
import SearchResultsHeader from './SearchResultsHeader';
import SourcesPopover from './SourcesPopover';
import type { UserLocation } from '@/lib/geo';
import { countActiveFilters, hasActiveFilters, type FilterState } from '@/lib/filters';
import type { SortOption } from '@/hooks/useEventSorting';
import type { PriceFilter } from '@/lib/price';
import type { TimeOfDayFilter } from '@/lib/timeOfDay';
import { formatRelativeTime } from '@/lib/dateFormat';
import { usePanelWidth } from '@/hooks/usePanelWidth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export type SheetSnap = 'collapsed' | 'half' | 'full';

const FILTERS_EXPANDED_KEY = 'whatsupnyc_filters_expanded';
const LIST_ONLY_HINT_KEY = 'whatsupnyc_list_only_hint';
const SAVED_HINT_KEY = 'whatsupnyc_saved_hint';
const SWIPE_HINT_KEY = 'whatsupnyc_swipe_hint_v1';

function loadFiltersExpanded(): boolean {
  try {
    return localStorage.getItem(FILTERS_EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export interface EventsPanelHandle {
  scrollToEventId: (id: string) => void;
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
  showSearchCatalogNote?: boolean;
  loadMoreError?: string | null;
  onClearRecent?: () => void;
  savedHydrating?: boolean;
  mapEventCount?: number;
  savedHydrateError?: string | null;
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
    showSearchCatalogNote = false,
    loadMoreError,
    onClearRecent,
    savedHydrating = false,
    mapEventCount = 0,
    savedHydrateError,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(loadFiltersExpanded);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [listOnlyHint, setListOnlyHint] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [swipeHintVisible, setSwipeHintVisible] = useState(false);

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

  useEffect(() => {
    try {
      if (localStorage.getItem(SAVED_HINT_KEY) !== '1') {
        setSavedHint('Save events with ♥ — filter saved anytime');
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  const useVirtual = events.length > 30;

  const virtualizer = useVirtualizer({
    count: isLoading ? 0 : events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 148,
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

  useImperativeHandle(ref, () => ({ scrollToEventId, setSheetSnap, focusSearch }), [
    scrollToEventId,
    setSheetSnap,
    focusSearch,
  ]);

  useEffect(() => {
    onMapResize?.();
  }, [isExpanded, sheetSnap, listOnlyMode, panelWidth, onMapResize]);

  useEffect(() => {
    if (!isMobile) {
      try {
        localStorage.setItem(FILTERS_EXPANDED_KEY, filtersExpanded ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
  }, [filtersExpanded, isMobile]);

  const handleExampleSearch = (q: string) => {
    onSearchChange(q);
    searchInputRef.current?.focus();
  };

  const updatedLabel = formatRelativeTime(lastScrapeAt);

  const panelHeader = (
    <div className="flex items-center justify-between border-b border-border px-5 py-4 min-h-[56px] shrink-0 bg-card">
      <div>
        <div className="flex items-center gap-2">
          <h2 className={`font-bold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>
            WhatsUpNYC
          </h2>
          <IngestBadge active={Boolean(ingesting)} degradedSources={degradedSources} />
        </div>
        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1" aria-live="polite">
          <span>
            {events.length} shown
            {dataSource === 'live' &&
              liveTotalCount != null &&
              liveTotalCount > events.length &&
              ` · ${liveTotalCount} in catalog`}
          </span>
          {updatedLabel && (
            <SourcesPopover updatedLabel={updatedLabel} degradedSources={degradedSources} />
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onListOnlyModeChange && (
          <button
            type="button"
            aria-label={listOnlyMode ? 'Show map' : 'List-only mode'}
            onClick={() => onListOnlyModeChange(!listOnlyMode)}
            title={listOnlyHint ?? (listOnlyMode ? 'Show map' : 'List-only mode')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              listOnlyMode ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {listOnlyMode ? (
              <Map className="w-4 h-4" aria-hidden />
            ) : (
              <List className="w-4 h-4" aria-hidden />
            )}
          </button>
        )}
        <button
          type="button"
          aria-label={selectedCategory === 'saved' ? 'Show all events' : 'Show saved events'}
          aria-pressed={selectedCategory === 'saved'}
          title={savedHint ?? undefined}
          onClick={() => {
            onCategoryChange(selectedCategory === 'saved' ? 'all' : 'saved');
            try {
              localStorage.setItem(SAVED_HINT_KEY, '1');
            } catch {
              /* ignore */
            }
            setSavedHint(null);
          }}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            selectedCategory === 'saved'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-muted text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart
            className={`w-4 h-4 ${selectedCategory === 'saved' ? 'fill-red-500' : ''}`}
            aria-hidden
          />
          {savedEventIds.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {savedEventIds.length}
            </span>
          )}
        </button>
        {!isMobile && (
          <button
            type="button"
            aria-label="Collapse events panel"
            onClick={onToggleExpand}
            className="w-8 h-8 rounded-xl bg-muted border-none cursor-pointer flex items-center justify-center text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const stickySearchZone = (
    <div className="shrink-0 bg-card border-b border-border" data-testid="sticky-zone">
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
      />
      <QuickShortcuts
        isMobile={isMobile}
        selectedDateRange={selectedDateRange}
        selectedPrice={selectedPrice}
        onDateRangeChange={onDateRangeChange}
        onPriceChange={onPriceChange}
        onNearMe={() => onNearMe?.()}
        nearMeActive={nearMeActive}
      />
      {isMobile && (
        <BoroughQuickFilters selected={selectedBorough} onChange={onBoroughChange} />
      )}
      <CollapsibleFilters
        isMobile={isMobile}
        expanded={filtersExpanded}
        onExpandedChange={setFiltersExpanded}
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
      />
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
      {showOnboarding && onDismissOnboarding && (
        <OnboardingBanner onDismiss={onDismissOnboarding} onExampleSearch={handleExampleSearch} />
      )}

      <PanelStatusBar
        status={panelStatus.status}
        message={panelStatus.message}
        onDismiss={panelStatus.dismiss}
      />

      <SearchResultsHeader
        searchQuery={searchQuery}
        eventsCount={events.length}
        searchLoading={searchLoading}
        isSearching={isSearching}
        searchTotalCount={searchTotalCount}
        sort={sort}
        showSearchCatalogNote={showSearchCatalogNote}
      />

      {swipeHintVisible && onSwipeSave && (
        <div className="mx-5 mb-2 p-2.5 rounded-card bg-muted/80 text-xs text-muted-foreground flex items-center justify-between gap-2">
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

      <div className="px-5 pb-5">
        {isLoading || (searchLoading && events.length === 0) ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="animate-pulse flex gap-4 p-4 mb-3 bg-muted/50 rounded-card border border-border"
            >
              <div className="w-14 h-14 bg-muted rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
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
                  <EventCard
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
            <EventCard
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
            {hasActiveFilters(filterState) &&
              loadedCount != null &&
              catalogTotal != null && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing {events.length} match{events.length === 1 ? '' : 'es'} from{' '}
                  {loadedCount} loaded · {catalogTotal} in catalog
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
    </div>
  );

  const panelBody = (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {panelHeader}
      {stickySearchZone}
      {scrollContent}
    </div>
  );

  if (listOnlyMode) {
    return (
      <div className="absolute inset-0 z-[1000] flex flex-col min-h-0 overflow-hidden bg-card/95 backdrop-blur-xl border-r border-border">
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
            className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col min-h-0 overflow-hidden rounded-t-3xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl pb-[env(safe-area-inset-bottom)]"
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
        {sheetSnap === 'collapsed' && !hideMobileBrowsePill && (
          <button
            type="button"
            onClick={() => setSheetSnap('half')}
            aria-label="Expand events panel"
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg flex items-center gap-2"
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
      <div className="absolute top-5 left-5 w-[60px] h-[60px] rounded-[20px] glass-panel bg-card/95 backdrop-blur-xl shadow-xl border border-border overflow-hidden z-[1000]">
        <button
          type="button"
          aria-label="Expand events panel"
          onClick={onToggleExpand}
          className="w-full h-full rounded-[20px] bg-primary border-none cursor-pointer flex items-center justify-center text-primary-foreground transition-all"
        >
          <Calendar className="w-6 h-6" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-5 left-5 h-[calc(100vh-40px)] rounded-[20px] glass-panel bg-card/95 backdrop-blur-xl shadow-xl border border-border overflow-hidden z-[1000] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col min-h-0"
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
    </div>
  );
});

export default EventsPanel;
