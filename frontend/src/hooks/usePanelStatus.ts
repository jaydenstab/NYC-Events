import { useState } from 'react';
import type { PanelStatusType } from '@/components/PanelStatusBar';

export function usePanelStatus(props: {
  ingesting: boolean;
  semanticFallback: boolean;
  semanticIndexing: boolean;
  searchQuery: string;
  approximateLocationMessage?: string | null;
  savedHydrateError?: string | null;
  savedHydrating?: boolean;
  mapEventCount?: number;
}): { status: PanelStatusType; message: string; dismiss: () => void } {
  const [approxDismissed, setApproxDismissed] = useState(false);
  const [mapHintDismissed, setMapHintDismissed] = useState(false);

  const {
    ingesting,
    semanticFallback,
    semanticIndexing,
    searchQuery,
    approximateLocationMessage,
    savedHydrateError,
    savedHydrating,
    mapEventCount = 0,
  } = props;

  if (savedHydrateError) {
    return {
      status: 'semantic',
      message: savedHydrateError,
      dismiss: () => {},
    };
  }

  if (savedHydrating) {
    return {
      status: 'semantic',
      message: 'Loading saved events…',
      dismiss: () => {},
    };
  }

  if (approximateLocationMessage && !approxDismissed) {
    return {
      status: 'approximate',
      message: approximateLocationMessage,
      dismiss: () => setApproxDismissed(true),
    };
  }

  if (ingesting) {
    return {
      status: 'ingesting',
      message: 'Refreshing events in the background — list updates automatically.',
      dismiss: () => {},
    };
  }

  if (searchQuery.trim().length >= 2 && (semanticFallback || semanticIndexing)) {
    return {
      status: 'semantic',
      message: semanticIndexing
        ? 'Improving search results — hang tight for a moment.'
        : 'Still loading smarter results…',
      dismiss: () => {},
    };
  }

  if (mapEventCount > 30 && !mapHintDismissed) {
    return {
      status: 'map',
      message: 'Tap a pin group to zoom in, or zoom for individual events.',
      dismiss: () => setMapHintDismissed(true),
    };
  }

  return { status: null, message: '', dismiss: () => {} };
}
