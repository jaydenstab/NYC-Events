import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, useMemo } from 'react';
import type { NYC3DMapHandle } from '@/components/NYC3DMap';

const NYC3DMap = lazy(() => import('@/components/NYC3DMap'));
const EventModal = lazy(() => import('@/components/EventModal'));
import EventsPanel, { type EventsPanelHandle, type SheetSnap } from '@/components/EventsPanel';
import MapSettings from '@/components/MapSettings';
import MapFabMenu from '@/components/MapFabMenu';
import Toast from '@/components/Toast';
import OfflineBanner from '@/components/OfflineBanner';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { Event } from '@/types/Event';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useSavedEventsHydration } from '@/hooks/useSavedEventsHydration';
import { useEventFiltering } from '@/hooks/useEventFiltering';
import { useEventSorting } from '@/hooks/useEventSorting';
import { useEventsData } from '@/hooks/useEventsData';
import { useAppUrlState } from '@/hooks/useAppUrlState';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useToast } from '@/hooks/useToast';
import { useMapPreferences } from '@/hooks/useMapPreferences';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { requestUserLocation, useUserLocation } from '@/lib/geo';
import { mergeEventsById } from '@/lib/mergeEvents';
import { hasActiveFilters } from '@/lib/filters';
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
  } = useEventsData({ searchQuery });

  const { savedHydratedEvents, savedHydrating, savedHydrateError } = useSavedEventsHydration(
    savedEventIds,
    events
  );

  const mergedEvents = useMemo(
    () => mergeEventsById(events, savedHydratedEvents),
    [events, savedHydratedEvents]
  );

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventNotFound, setEventNotFound] = useState(false);
  const [mapFocusedEventId, setMapFocusedEventId] = useState<string | null>(null);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const [isEventsPanelOpen, setIsEventsPanelOpen] = useState(!isMobile);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { appearance, is3D, setAppearance, setIs3D } = useMapPreferences();
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
    dataSource === 'live' && typeof apiMeta.totalCount === 'number' ? apiMeta.totalCount : undefined;
  const showSearchCatalogNote =
    isSearching &&
    !searchLoading &&
    catalogTotal != null &&
    events.length < catalogTotal;

  usePageMeta(selectedEvent);

  useEffect(() => {
    setIsEventsPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (dataSource === 'live') {
      setDemoBannerDismissed(false);
      if (!isOnboardingDismissed()) {
        setShowOnboarding(true);
      }
    }
  }, [dataSource]);

  useEffect(() => {
    if (!eventId || loading) return;

    const found = mergedEvents.find((e) => e.id === eventId);
    if (found) {
      setSelectedEvent(found);
      setEventNotFound(false);
    } else if (mergedEvents.length > 0) {
      setSelectedEvent(null);
      setEventNotFound(true);
    }
  }, [eventId, mergedEvents, loading]);

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
        panelRef.current?.focusSearch();
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
  ]);

  const filteredEvents = useEventFiltering(
    mergedEvents,
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

  const fitBoundsKey = `${selectedBorough}|${selectedDateRange}|${selectedCategory}|${filteredEvents.length}`;
  const fitBoundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (selectedEvent) return;

    if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);
    fitBoundsTimerRef.current = setTimeout(() => {
      if (filteredEvents.length > 0 && filteredEvents.length <= 50) {
        mapRef.current?.fitBoundsToEvents(filteredEvents);
      }
    }, 300);

    return () => {
      if (fitBoundsTimerRef.current) clearTimeout(fitBoundsTimerRef.current);
    };
  }, [fitBoundsKey, filteredEvents, selectedEvent]);

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
          onAction: () => setSelectedCategory('saved'),
        });
      } else {
        showToast('Removed from saved', {
          actionLabel: 'Undo',
          onAction: () => toggleSaveEvent(eventIdToToggle),
        });
      }
    },
    [isEventSaved, toggleSaveEvent, showToast, setSelectedCategory]
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
      className={`app-shell w-screen h-screen relative overflow-hidden bg-[#1a1a1a] ${
        appearance === 'dark' ? 'dark' : ''
      } ${mobileDrawerOpen ? 'mobile-drawer-open' : ''}`}
    >
      <a
        href="#panel-scroll"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[5000] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold"
      >
        Skip to events
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

      <Suspense
        fallback={
          <div className="map-root absolute inset-0 bg-[#1a1a1a] animate-pulse" aria-hidden />
        }
      >
        <NYC3DMap
          ref={mapRef}
          events={sortedEvents}
          onEventSelect={handleMapEventSelect}
          onApproximateLocation={handleApproximateLocation}
          appearance={appearance}
          is3D={is3D}
          hidden={listOnlyMode}
        />
      </Suspense>

      <EventsPanel
        ref={panelRef}
        events={sortedEvents}
        isLoading={loading}
        isExpanded={isEventsPanelOpen}
        onToggleExpand={() => setIsEventsPanelOpen((v) => !v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
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
        onRemoveSaved={() => setSelectedCategory('all')}
        onRemoveBorough={() => setSelectedBorough('all')}
        onRemovePrice={() => setSelectedPrice('all')}
        onRemoveTimeOfDay={() => setSelectedTimeOfDay('all')}
        listOnlyMode={listOnlyMode}
        onListOnlyModeChange={setListOnlyMode}
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
        hideMobileBrowsePill={isMobile}
        loadedCount={mergedEvents.length}
        catalogTotal={catalogTotal}
        isSearching={isSearching}
        searchTotalCount={
          isSearching && searchScopedMeta && typeof apiMeta.totalCount === 'number'
            ? apiMeta.totalCount
            : undefined
        }
        showSearchCatalogNote={showSearchCatalogNote}
        savedHydrating={savedHydrating}
        savedHydrateError={savedHydrateError}
        mapEventCount={sortedEvents.length}
      />

      {error && mergedEvents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[2000] p-6 text-center">
          <div className="bg-card rounded-3xl p-8 shadow-2xl max-w-sm">
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

      <MapSettings
        isOpen={isSettingsOpen}
        onToggle={() => setIsSettingsOpen((v) => !v)}
        hideToggle={isMobile}
        demoBannerVisible={demoBannerVisible}
        appearance={appearance}
        onAppearanceChange={setAppearance}
        is3D={is3D}
        onIs3DChange={setIs3D}
        listOnlyMode={listOnlyMode}
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
        onToggleSettings={() => setIsSettingsOpen((v) => !v)}
        onToggleListOnly={() => setListOnlyMode((v) => !v)}
      />

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
