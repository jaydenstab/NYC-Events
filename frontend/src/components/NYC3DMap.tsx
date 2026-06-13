import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useMemo,
  useImperativeHandle,
} from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Event } from '@/types/Event';
import { isApproximateCoords, NYC_DEFAULT } from '@/lib/geo';
import { motionDuration } from '@/lib/motion';
import type { MapAppearance } from '@/hooks/useMapPreferences';
import {
  appearanceToStyleUrl,
  eventsToGeoJson,
  initEventLayers,
  MAP_3D_PITCH,
  removeEventSourceLayers,
  setMap3DMode,
  shouldClusterEvents,
} from '@/lib/mapLayers';
import { ensureEventPinImage, EVENT_PIN_IMAGE_ID } from '@/lib/mapPinImage';

export interface NYC3DMapHandle {
  flyToEvent: (event: Event, opts?: { animate?: boolean }) => void;
  setHighlightedId: (id: string | null) => void;
  fitBoundsToEvents: (events: Event[]) => void;
  resize: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
}

export interface NYC3DMapProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onApproximateLocation?: () => void;
  appearance?: MapAppearance;
  is3D?: boolean;
  hidden?: boolean;
}

const NYC3DMap = forwardRef<NYC3DMapHandle, NYC3DMapProps>(function NYC3DMap(
  {
    events,
    onEventSelect,
    onApproximateLocation,
    appearance = 'light',
    is3D = true,
    hidden = false,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const eventsRef = useRef(events);
  const onEventSelectRef = useRef(onEventSelect);
  const onApproximateLocationRef = useRef(onApproximateLocation);
  const highlightedIdRef = useRef<string | null>(null);
  const lastFlownIdRef = useRef<string | null>(null);
  const pendingOpsRef = useRef<Array<() => void>>([]);
  const is3DRef = useRef(is3D);
  const clusteredRef = useRef(true);
  const [mapError, setMapError] = useState<string | null>(null);

  is3DRef.current = is3D;
  eventsRef.current = events;
  onEventSelectRef.current = onEventSelect;
  onApproximateLocationRef.current = onApproximateLocation;

  const mapboxToken = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim();

  const geojsonEvents = useMemo(() => eventsToGeoJson(events), [events]);

  const flushPending = () => {
    const ops = pendingOpsRef.current;
    pendingOpsRef.current = [];
    ops.forEach((op) => op());
  };

  const setHighlightedId = (id: string | null) => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) {
      pendingOpsRef.current.push(() => setHighlightedId(id));
      return;
    }

    if (!m.getSource('events-source')) return;

    if (highlightedIdRef.current) {
      try {
        m.setFeatureState({ source: 'events-source', id: highlightedIdRef.current }, { selected: false });
      } catch {
        /* feature may not exist */
      }
    }

    highlightedIdRef.current = id;

    if (id) {
      try {
        m.setFeatureState({ source: 'events-source', id }, { selected: true });
      } catch {
        /* feature may not exist */
      }
    }
  };

  const flyToEvent = (event: Event, opts?: { animate?: boolean }) => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) {
      pendingOpsRef.current.push(() => flyToEvent(event, opts));
      return;
    }

    if (lastFlownIdRef.current === event.id && highlightedIdRef.current === event.id) return;

    const animate = opts?.animate !== false;
    const duration = animate ? motionDuration(1000) : 0;
    const approx = isApproximateCoords(event.lat, event.lng, event.locationQuality);
    const threeD = is3DRef.current;

    if (approx) {
      onApproximateLocationRef.current?.();
      m.flyTo({
        center: [event.lng, event.lat],
        zoom: 12,
        pitch: threeD ? MAP_3D_PITCH : 0,
        bearing: -17.6,
        duration,
      });
    } else {
      m.flyTo({
        center: [event.lng, event.lat],
        zoom: 16,
        pitch: threeD ? MAP_3D_PITCH : 0,
        bearing: -17.6,
        duration,
      });
    }

    lastFlownIdRef.current = event.id;
  };

  const fitBoundsToEvents = (evts: Event[]) => {
    const m = map.current;
    if (!m || !m.isStyleLoaded() || evts.length === 0 || evts.length > 50) return;

    const threeD = is3DRef.current;

    if (evts.length === 1) {
      const e = evts[0];
      m.flyTo({
        center: [e.lng, e.lat],
        zoom: 15,
        pitch: threeD ? MAP_3D_PITCH : 0,
        bearing: -17.6,
        duration: motionDuration(800),
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    evts.forEach((e) => bounds.extend([e.lng, e.lat]));
    m.fitBounds(bounds, {
      padding: 60,
      duration: motionDuration(800),
      maxZoom: 14,
      minZoom: 10,
    });
  };

  const resize = () => {
    map.current?.resize();
  };

  const zoomIn = () => {
    map.current?.zoomIn({ duration: motionDuration(300) });
  };

  const zoomOut = () => {
    map.current?.zoomOut({ duration: motionDuration(300) });
  };

  const resetNorth = () => {
    const m = map.current;
    if (!m) return;
    m.easeTo({
      bearing: -17.6,
      pitch: is3DRef.current ? MAP_3D_PITCH : 0,
      duration: motionDuration(500),
    });
  };

  useImperativeHandle(ref, () => ({
    flyToEvent,
    setHighlightedId,
    fitBoundsToEvents,
    resize,
    zoomIn,
    zoomOut,
    resetNorth,
  }));

  const bootstrapEventLayers = (m: mapboxgl.Map, afterInit?: () => void) => {
    const latestGeoJson = eventsToGeoJson(eventsRef.current);
    void ensureEventPinImage(m)
      .then(() => {
        setMap3DMode(m, is3DRef.current, appearance);
        initEventLayers(
          m,
          latestGeoJson,
          () => eventsRef.current,
          () => onEventSelectRef.current,
          eventsRef.current.length
        );
        clusteredRef.current = shouldClusterEvents(eventsRef.current.length);
        afterInit?.();
        flushPending();
      })
      .catch((err) => {
        console.error('Failed to load map markers:', err);
        setMapError('Could not load map markers. Refresh the page.');
      });
  };

  const syncEventSourceData = () => {
    const m = map.current;
    if (!m?.isStyleLoaded()) return false;
    if (!m.hasImage(EVENT_PIN_IMAGE_ID)) return false;

    const count = eventsRef.current.length;
    const nextClustered = shouldClusterEvents(count);
    const geoJson = eventsToGeoJson(eventsRef.current);

    if (m.getSource('events-source') && nextClustered !== clusteredRef.current) {
      clusteredRef.current = nextClustered;
      const highlight = highlightedIdRef.current;
      removeEventSourceLayers(m);
      initEventLayers(
        m,
        geoJson,
        () => eventsRef.current,
        () => onEventSelectRef.current,
        count
      );
      if (highlight) {
        try {
          m.setFeatureState({ source: 'events-source', id: highlight }, { selected: true });
        } catch {
          /* ignore */
        }
      }
      return true;
    }

    const source = m.getSource('events-source') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return false;
    source.setData(geoJson);
    clusteredRef.current = nextClustered;
    return true;
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    if (!mapboxToken || mapboxToken.includes('your_mapbox')) {
      setMapError('Set VITE_MAPBOX_ACCESS_TOKEN in frontend/.env.local');
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      const pitch = is3DRef.current ? MAP_3D_PITCH : 0;
      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: appearanceToStyleUrl(appearance),
        center: [NYC_DEFAULT.lng, NYC_DEFAULT.lat],
        zoom: 10,
        pitch,
        bearing: -17.6,
        antialias: true,
      });

      map.current = m;

      m.on('load', () => {
        bootstrapEventLayers(m);

        m.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }),
          'bottom-right'
        );

        m.resize();
        flushPending();
      });

      m.on('error', (e) => {
        const err = e.error as { status?: number } | undefined;
        if (err?.status === 401) setMapError('Invalid Mapbox Token');
      });
    } catch {
      setMapError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per token
  }, [mapboxToken]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!syncEventSourceData()) {
      pendingOpsRef.current.push(() => {
        syncEventSourceData();
      });
    }

    if (!m.isStyleLoaded()) return;

    if (highlightedIdRef.current) {
      try {
        m.setFeatureState(
          { source: 'events-source', id: highlightedIdRef.current },
          { selected: true }
        );
      } catch {
        /* ignore */
      }
    }
  }, [geojsonEvents]);

  const prevAppearanceRef = useRef(appearance);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    if (prevAppearanceRef.current === appearance) return;

    prevAppearanceRef.current = appearance;
    const styleUrl = appearanceToStyleUrl(appearance);
    const prevHighlight = highlightedIdRef.current;

    m.setStyle(styleUrl);
    m.once('style.load', () => {
      bootstrapEventLayers(m, () => {
        if (prevHighlight) setHighlightedId(prevHighlight);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance]);

  useEffect(() => {
    const m = map.current;
    if (!m?.isStyleLoaded()) return;
    const pitch = is3D ? MAP_3D_PITCH : 0;
    m.easeTo({ pitch, duration: motionDuration(500) });
    setMap3DMode(m, is3D, appearance);
  }, [is3D, appearance]);

  return (
    <div
      className={`map-root w-full h-full relative bg-surface ${hidden ? 'hidden' : ''}`}
      aria-hidden={hidden}
    >
      <div ref={mapContainer} className="w-full h-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white z-[2000]">
          <div className="text-center p-6">
            <p className="font-bold text-xl mb-2">Map Unavailable</p>
            <p className="text-gray-400 max-w-sm">{mapError}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default NYC3DMap;
