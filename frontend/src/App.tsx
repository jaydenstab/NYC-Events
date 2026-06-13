import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, useMemo } from 'react';
import type { NYC3DMapHandle } from '@/components/NYC3DMap';

const NYC3DMap = lazy(() => import('@/components/NYC3DMap'));
const EventModal = lazy(() => import('@/components/EventModal'));
import EventsPanel, { type EventsPanelHandle, type SheetSnap } from '@/components/EventsPanel';
import BottomNav, { type AppTab } from '@/components/BottomNav';
import MapLegend from '@/components/MapLegend';
import MapControlBar from '@/components/MapControlBar';
import MapFabMenu from '@/components/MapFabMenu';
import Toast from '@/components/Toast';
import OfflineBanner from '@/components/OfflineBanner';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { Event } from '@/types/Event';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useSavedEventsHydration } from '@/hooks/useSavedEventsHydration';
import { useEventDeepLinkHydration } from '@/hooks/useEventDeepLinkHydration';
import { useEventFiltering } from '@/hooks/useEventFiltering';
import { useEventSorting } from '@/hooks/useEventSorting';
import { useEventsData } from '@/hooks/useEventsData';
import { useAppUrlState } from '@/hooks/useAppUrlState';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useToast } from '@/hooks/useToast';
import { useAppPreferences } from '@/hooks/useAppPreferences';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { requestUserLocation, useUserLocation } from '@/lib/geo';
import { mergeEventsById } from '@/lib/mergeEvents';
import { hasActiveFilters } from '@/lib/filters';
import { shouldAutoFitEvents } from '@/lib/mapFit';
import { usePanelCollapse } from '@/hooks/usePanelCollapse';
import type { DemoFallbackReason } from '@/services/api';
import { isOnboardingDismissed } from '@/lib/onboarding';

function demoBannerMessage(reason: DemoFallbackReason | undefined): string {
  if (reason === 'network_error') {
    return import.meta.env.DEV
      ? 'Could not reach the API — showing sample events. Check the server and retry.'
      : "Couldn't load live events — showing samples.";
  }
  return import.meta.env.DEV
    ? 'Showing sample events — run ingest to load real NYC data'
    : "Couldn't load live events — showing samples.";
}

function isSearchScopedMeta(
  meta: Record<string, unknown>,
  searchQuery: string
): boolean {
  const q = searchQuery.trim();
  if (q.length < 2) return false;
  if (meta.hybridSearch === true || meta.semanticFallback === true) return true;
  if (typeof meta.searchQuery === 'string' && meta.searchQuery === q) return true;
  return false;
}

const App: React.FC = () => {
  const { isMobile } = useWindowSize();
  const { savedEventIds, toggleSaveEvent, isEventSaved } = useSavedEvents();
  const { location: userLocation, refresh: refreshLocation } = useUserLocation();
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();
  const { isOffline } = useNetworkStatus();

  const url = useAppUrlState();
  const {
    eventId,
    setEventId,
    clearEventParam,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedDateRange,
    setSelectedDateRange,
    selectedBorough,
    setSelectedBorough,
    selectedPrice,
    setSelectedPrice,
    selectedTimeOfDay,
    setSelectedTimeOfDay,
    sort,
    setSort,
    clearAllFilters,
    activeTab,
    setActiveTab,
  } = url;

  const {
    events,
    loading,
    searchLoading,
    error,
    loadMoreError,
    apiMeta,
    dataSource,
    demoReason,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore,
    catalogTotalCount,
  } = useEventsData({ searchQuery });

  const { savedHydratedEvents, savedHydrating, savedHydrateError } = useSavedEventsHydration(
    savedEventIds,
    events
  );

  const mergedEvents = useMemo(
    () => mergeEventsById(events, savedHydratedEvents),
    [events, savedHydratedEvents]
  );

  const {
    hydratedEvent: deepLinkEvent,
    hydrating: deepLinkHydrating,
  } = useEventDeepLinkHydration(eventId, mergedEvents, !loading);

  const mergedWithDeepLink = useMemo(
    () => (deepLinkEvent ? mergeEventsById(mergedEvents, [deepLinkEvent]) : mergedEvents),
    [mergedEvents, deepLinkEvent]
  );

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventNotFound, setEventNotFound] = useState(false);
  const [mapFocusedEventId, setMapFocusedEventId] = useState<string | null>(null);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const { isExpanded: isEventsPanelOpen, setCollapsed, toggleCollapsed } =
    usePanelCollapse(isMobile);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const {
    appTheme,
    resolvedAppTheme,
    mapAppearance,
    is3D,
    setAppTheme,
    setMapAppearance,
    setIs3D,
  } = useAppPreferences();
  const [listOnlyMode, setListOnlyMode] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [approximateLocationMessage, setApproximateLocationMessage] = useState<string | null>(
    null
  );
  const prevSheetSnapRef = useRef<SheetSnap>('half');
  const prevSearchLoadingRef = useRef(false);
  const mapRef = useRef<NYC3DMapHandle>(null);
  const panelRef = useRef<EventsPanelHandle>(null);

  const isSearching = searchQuery.trim().length >= 2;
  const searchScopedMeta = isSearchScopedMeta(apiMeta, searchQuery);
  const catalogTotal =
    !isSearching && dataSource === 'live' && typeof catalogTotalCount === 'number'
      ? catalogTotalCount
      : undefined;

  usePageMeta(selectedEvent);

  useEffect(() => {
    if (!eventId || isMobile || listOnlyMode) return;
    setCollapsed(false);
  }, [eventId, isMobile, listOnlyMode, setCollapsed]);

  useEffect(() => {
    if (dataSource === 'live') {
      setDemoBannerDismissed(false);
      if (!isOnboardingDismissed()) {
        setShowOnboarding(true);
      }
    }
  }, [dataSource]);

  useEffect(() => {
    if (!eventId || loading || deepLinkHydrating) return;

    const found = mergedWithDeepLink.find((e) => e.id === eventId);
    if (found) {
      setSelectedEvent(found);
      setEventNotFound(false);
    } else {
      setSelectedEvent(null);
      setEventNotFound(true);
    }
  }, [eventId, mergedWithDeepLink, loading, deepLinkHydrating]);

  useEffect(() => {
    if (prevSearchLoadingRef.current && !searchLoading) {
      const term = searchQuery.trim();
      if (term.length >= 2) addRecent(term);
    }
    prevSearchLoadingRef.current = searchLoading;
  }, [searchLoading, searchQuery, addRecent]);

  useEffect(() => {
    setMapFocusedEventId(null);
  }, [
    selectedCategory,
    selectedDateRange,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay,
    searchQuery,
  ]);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
    setEventNotFound(false);
    clearEventParam();
    if (isMobile) {
      setSheetSnap(prevSheetSnapRef.current);
    }
  }, [clearEventParam, isMobile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === '?' && !inInput) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        if (!isMobile && !isEventsPanelOpen) setCollapsed(false);
        panelRef.current?.focusSearch();
        return;
      }

      if (e.key === '[' && !isMobile && !selectedEvent && !eventNotFound && !shortcutsOpen) {
        e.preventDefault();
        toggleCollapsed();
        return;
      }

      if (e.key === 'Escape') {
        if (selectedEvent || eventNotFound) {
          handleCloseModal();
          return;
        }
        if (
          hasActiveFilters({
            searchQuery,
            selectedCategory,
            selectedDateRange,
            selectedBorough,
            selectedPrice,
            selectedTimeOfDay,
            showSavedOnly: selectedCategory === 'saved',
          })
        ) {
          clearAllFilters();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    searchQuery,
    selectedCategory,
    selectedDateRange,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay,
    selectedEvent,
    eventNotFound,
    clearAllFilters,
    handleCloseModal,
    isMobile,
    isEventsPanelOpen,
    setCollapsed,
    toggleCollapsed,
    shortcutsOpen,
  ]);

  const filteredEvents = useEventFiltering(
    mergedWithDeepLink,
    selectedCategory,
    selectedDateRange,
    savedEventIds,
    selectedBorough,
    selectedPrice,
    selectedTimeOfDay
  );

  const sortedEvents = useEventSorting(
    filteredEvents,
    sort,
    userLocation,
    isSearching
  );

  const showSearchCatalogNote =
    isSearching &&
    !searchLoading &&
    hasActiveFilters({
      searchQuery: '',
      selectedCategory,
      selectedDateRange,
      selectedBorough,
      selectedPrice,
      selectedTimeOfDay,
      showSavedOnly: selectedCategory === 'saved',
    }) &&
    sortedEvents.length <
      (searchScopedMeta && typeof apiMeta.totalCount === 'number' ? apiMeta.totalCount : events.length);

  const fitBoundsKey = `${selectedBorough}|${selectedDateRange}|${selectedCategory}|${filteredEvents.length}`;
  const fitBoundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (selectedEvent) return;
    if (listOnlyMode) return;

    if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);
    fitBoundsTimerRef.current = setTimeout(() => {
      if (shouldAutoFitEvents(filteredEvents)) {
        mapRef.current?.fitBoundsToEvents(filteredEvents);
      }
    }, 300);

    return () => {
      if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);
    };
  }, [fitBoundsKey, filteredEvents, selectedEvent, listOnlyMode]);

  useEffect(() => {
    if (!selectedEvent) {
      if (!mapFocusedEventId) {
        mapRef.current?.setHighlightedId(null);
      }
      return;
    }
    mapRef.current?.setHighlightedId(selectedEvent.id);
    mapRef.current?.flyToEvent(selectedEvent);
    panelRef.current?.scrollToEventId(selectedEvent.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id-only dep avoids re-fly on unrelated field changes
  }, [selectedEvent?.id, mapFocusedEventId]);

  useEffect(() => {
    if (!mapFocusedEventId || selectedEvent) return;
    mapRef.current?.setHighlightedId(mapFocusedEventId);
  }, [mapFocusedEventId, selectedEvent]);

  const handleMapResize = useCallback(() => {
    mapRef.current?.resize();
  }, []);

  const handleListOnlyModeChange = useCallback(
    (next: boolean) => {
      if (next && !isMobile && !isEventsPanelOpen) {
        setCollapsed(false);
      }
      setListOnlyMode(next);
    },
    [isMobile, isEventsPanelOpen, setCollapsed]
  );

  const handleSelectEvent = useCallback(
    (event: Event) => {
      setSelectedEvent(event);
      setEventNotFound(false);
      setEventId(event.id);
      setMapFocusedEventId(event.id);
    },
    [setEventId]
  );

  const handleShowOnMap = useCallback((event: Event) => {
    setMapFocusedEventId(event.id);
    mapRef.current?.setHighlightedId(event.id);
    mapRef.current?.flyToEvent(event);
    panelRef.current?.scrollToEventId(event.id);
  }, []);

  const handleEventClick = useCallback(
    (event: Event) => handleSelectEvent(event),
    [handleSelectEvent]
  );

  const handleMapEventSelect = useCallback(
    (event: Event) => handleSelectEvent(event),
    [handleSelectEvent]
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      if (category === 'saved') {
        setActiveTab('saved');
      } else if (activeTab === 'saved') {
        setActiveTab('discover');
      }
    },
    [setSelectedCategory, activeTab, setActiveTab]
  );

  const handleTabChange = useCallback(
    (tab: AppTab) => {
      if (!isMobile && (tab === 'saved' || tab === 'profile')) {
        setCollapsed(false);
      }
      setActiveTab(tab);
      if (tab === 'saved') {
        setSelectedCategory('saved');
        if (isMobile) setSheetSnap('half');
      } else if (tab === 'discover') {
        if (selectedCategory === 'saved') setSelectedCategory('all');
      }
      panelRef.current?.scrollToTop?.();
    },
    [setActiveTab, setSelectedCategory, selectedCategory, isMobile, setCollapsed]
  );

  useEffect(() => {
    if (activeTab === 'saved' && selectedCategory !== 'saved') {
      setSelectedCategory('saved');
    }
  }, [activeTab, selectedCategory, setSelectedCategory]);
  const handleDateRangeChange = useCallback(
    (range: string) => {
      setSelectedDateRange(range);
      if (range !== 'all' && sort === 'relevance') {
        setSort('date');
      }
    },
    [setSelectedDateRange, setSort, sort]
  );

  const handleToggleSaveSelected = useCallback(() => {
    if (selectedEvent) toggleSaveEvent(selectedEvent.id);
  }, [selectedEvent, toggleSaveEvent]);

  const handleToggleSave = useCallback(
    (eventIdToToggle: string) => {
      const wasSaved = isEventSaved(eventIdToToggle);
      toggleSaveEvent(eventIdToToggle);
      if (!wasSaved) {
        showToast('Saved', {
          actionLabel: 'View saved',
          onAction: () => {
            setSelectedCategory('saved');
            setActiveTab('saved');
            if (!isMobile) setCollapsed(false);
            if (isMobile) setSheetSnap('half');
          },
        });
      } else {
        showToast('Removed from saved', {
          actionLabel: 'Undo',
          onAction: () => toggleSaveEvent(eventIdToToggle),
        });
      }
    },
    [isEventSaved, toggleSaveEvent, showToast, setSelectedCategory, setActiveTab, isMobile, setCollapsed]
  );

  const handleNearMe = useCallback(async () => {
    try {
      await requestUserLocation();
      refreshLocation();
      setSort('distance');
    } catch {
      showToast('Enable location to sort by distance');
    }
  }, [refreshLocation, setSort, showToast]);

  useEffect(() => {
    if (!selectedEvent && !eventNotFound) return;
    if (!isMobile) return;
    setSheetSnap((current) => {
      prevSheetSnapRef.current = current;
      return 'collapsed';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id-only dep avoids sheet snap on unrelated field changes
  }, [selectedEvent?.id, eventNotFound, isMobile]);

  const handleApproximateLocation = useCallback(() => {
    setApproximateLocationMessage('Pin shows approximate neighborhood location.');
  }, []);

  const handleRefresh = useCallback(() => {
    refetch(searchQuery, isSearching);
  }, [refetch, searchQuery, isSearching]);

  const handleSwipeSave = useCallback(
    (eventIdToToggle: string) => {
      handleToggleSave(eventIdToToggle);
    },
    [handleToggleSave]
  );

  const mobileDrawerOpen = isMobile && sheetSnap !== 'collapsed';
  const nearMeActive = sort === 'distance' && userLocation != null;

  const degradedSources = Array.isArray(apiMeta.degradedSources)
    ? apiMeta.degradedSources
    : [];

  const lastScrapeAt =
    typeof apiMeta.lastScrapeAt === 'string' ? apiMeta.lastScrapeAt : null;

  const demoBannerVisible = dataSource === 'demo' && !demoBannerDismissed;
  const offlineBannerVisible =
    isOffline || (mergedEvents.length > 0 && demoReason === 'network_error');

  const highlightedEventId = selectedEvent?.id ?? mapFocusedEventId;

  return (
    <div
      className={`app-shell app-theme-${resolvedAppTheme} w-screen h-screen overflow-hidden ${
        !isMobile && !listOnlyMode ? 'flex flex-row' : 'relative'
      } ${mobileDrawerOpen ? 'mobile-drawer-open' : ''} ${isMobile ? 'bottom-nav-visible' : ''}`}
    >
      <a
        href="#panel-scroll"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[5000] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold"
      >
        Skip to events
      </a>
      <a
        href="#map-stage"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-40 focus:z-[5000] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold"
      >
        Skip to map
      </a>

      <OfflineBanner
        visible={offlineBannerVisible && !demoBannerVisible}
        onRetry={handleRefresh}
      />

      {demoBannerVisible && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-[3000] flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-amber-950 text-sm font-semibold shadow-lg"
        >
          <span>{demoBannerMessage(demoReason)}</span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetch(searchQuery, isSearching)}
              className="px-3 py-1 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 text-xs font-bold"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setDemoBannerDismissed(true)}
              className="px-3 py-1 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <EventsPanel
        ref={panelRef}
        events={sortedEvents}
        isLoading={loading}
        isExpanded={isEventsPanelOpen}
        onToggleExpand={toggleCollapsed}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={handleDateRangeChange}
        selectedBorough={selectedBorough}
        onBoroughChange={setSelectedBorough}
        selectedPrice={selectedPrice}
        onPriceChange={setSelectedPrice}
        selectedTimeOfDay={selectedTimeOfDay}
        onTimeOfDayChange={setSelectedTimeOfDay}
        sort={sort}
        onSortChange={setSort}
        onEventClick={handleEventClick}
        onShowOnMap={handleShowOnMap}
        isMobile={isMobile}
        savedEventIds={savedEventIds}
        isEventSaved={isEventSaved}
        onToggleSave={handleToggleSave}
        searchLoading={searchLoading}
        dataSource={dataSource}
        semanticFallback={Boolean(apiMeta.semanticFallback)}
        semanticIndexing={Boolean(apiMeta.semanticIndexing)}
        ingesting={Boolean(apiMeta.ingesting)}
        degradedSources={degradedSources}
        liveTotalCount={!isSearching ? catalogTotal : undefined}
        lastScrapeAt={lastScrapeAt}
        highlightedEventId={highlightedEventId}
        userLocation={userLocation}
        showOnboarding={showOnboarding}
        onDismissOnboarding={() => setShowOnboarding(false)}
        sheetSnap={sheetSnap}
        onSheetSnapChange={setSheetSnap}
        onClearAllFilters={clearAllFilters}
        onRemoveSearch={() => setSearchQuery('')}
        onRemoveCategory={() => setSelectedCategory('all')}
        onRemoveDate={() => setSelectedDateRange('all')}
        onRemoveSaved={() => handleCategoryChange('all')}
        onRemoveBorough={() => setSelectedBorough('all')}
        onRemovePrice={() => setSelectedPrice('all')}
        onRemoveTimeOfDay={() => setSelectedTimeOfDay('all')}
        listOnlyMode={listOnlyMode}
        onListOnlyModeChange={handleListOnlyModeChange}
        onMapResize={handleMapResize}
        approximateLocationMessage={approximateLocationMessage}
        recentSearches={recent}
        onRecentSearchSelect={setSearchQuery}
        onClearRecent={clearRecent}
        onNearMe={handleNearMe}
        nearMeActive={nearMeActive}
        onRefresh={handleRefresh}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        loadMoreError={loadMoreError}
        onSwipeSave={isMobile ? handleSwipeSave : undefined}
        hideMobileBrowsePill={false}
        loadedCount={events.length}
        catalogTotal={catalogTotal}
        isSearching={isSearching}
        searchTotalCount={
          isSearching && searchScopedMeta && typeof apiMeta.totalCount === 'number'
            ? apiMeta.totalCount
            : undefined
        }
        searchCapped={isSearching && apiMeta.searchCapped === true}
        searchLimit={typeof apiMeta.searchLimit === 'number' ? apiMeta.searchLimit : 50}
        filteredEventCount={sortedEvents.length}
        showSearchCatalogNote={showSearchCatalogNote}
        savedHydrating={savedHydrating}
        savedHydrateError={savedHydrateError}
        mapEventCount={sortedEvents.length}
        activeTab={activeTab}
        appTheme={appTheme}
        onAppThemeChange={setAppTheme}
        mapAppearance={mapAppearance}
        onMapAppearanceChange={setMapAppearance}
        is3D={is3D}
        onIs3DChange={setIs3D}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        showBottomNavPadding={isMobile}
        onTabChange={handleTabChange}
      />

      <div
        id="map-stage"
        className={
          isMobile
            ? 'map-stage absolute inset-0'
            : listOnlyMode
              ? 'hidden'
              : 'map-stage relative flex-1 min-w-0 min-h-0'
        }
        aria-label="Map"
      >
        <Suspense
          fallback={
            <div className="map-root absolute inset-0 bg-surface animate-pulse" aria-hidden />
          }
        >
          <NYC3DMap
            ref={mapRef}
            events={sortedEvents}
            onEventSelect={handleMapEventSelect}
            onApproximateLocation={handleApproximateLocation}
            appearance={mapAppearance}
            is3D={is3D}
            hidden={listOnlyMode}
          />
        </Suspense>

        <MapLegend hidden={listOnlyMode} eventCount={sortedEvents.length} />
        <MapControlBar
          mapRef={mapRef}
          is3D={is3D}
          onIs3DChange={setIs3D}
          hidden={listOnlyMode}
        />

        <MapFabMenu
          isMobile={isMobile}
          visible={isMobile && (sheetSnap === 'collapsed' || listOnlyMode)}
          eventCount={sortedEvents.length}
          listOnlyMode={listOnlyMode}
          onBrowseEvents={() => {
            setSheetSnap('half');
            panelRef.current?.setSheetSnap('half');
          }}
          onOpenProfile={() => handleTabChange('profile')}
          onToggleListOnly={() => handleListOnlyModeChange(!listOnlyMode)}
        />
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        savedCount={savedEventIds.length}
        hidden={!isMobile || Boolean(selectedEvent) || eventNotFound}
      />

      {error && mergedEvents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[2000] p-6 text-center">
          <div className="bg-surface-elevated rounded-3xl p-8 shadow-2xl max-w-sm border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-2">Connection Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <EventModal
          event={selectedEvent}
          eventNotFound={eventNotFound && !selectedEvent}
          onClose={handleCloseModal}
          onClearEventLink={clearEventParam}
          isMobile={isMobile}
          isSaved={selectedEvent ? isEventSaved(selectedEvent.id) : false}
          onToggleSave={handleToggleSaveSelected}
        />
      </Suspense>

      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Toast toasts={toasts} onDismiss={dismissToast} isMobile={isMobile} />
    </div>
  );
};

export default App;
