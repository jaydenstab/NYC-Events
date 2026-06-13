import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types/Event';
import { categoryConfig } from '@/types/Event';
import { resolveEventFromMapClick } from '@/lib/mapEventResolver';
import type { MapAppearance } from '@/hooks/useAppPreferences';
import { EVENT_PIN_IMAGE_ID } from '@/lib/mapPinImage';

const STYLE_URLS: Record<MapAppearance, string> = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const UNCLUSTERED_PIN_LAYER = 'unclustered-pin';
export const CLUSTERS_LAYER_ID = 'clusters';
export const CLUSTER_MAX_ZOOM = 12;
export const CLUSTER_RADIUS = 30;
export const CLUSTER_DISABLE_THRESHOLD = 10;

export function shouldClusterEvents(eventCount: number): boolean {
  return eventCount > CLUSTER_DISABLE_THRESHOLD;
}

export function buildEventsSourceClusterOptions(eventCount: number) {
  if (!shouldClusterEvents(eventCount)) {
    return { cluster: false as const, promoteId: 'id' as const };
  }
  return {
    cluster: true as const,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterRadius: CLUSTER_RADIUS,
    promoteId: 'id' as const,
  };
}

export function removeEventSourceLayers(m: mapboxgl.Map) {
  if (m.getLayer(CLUSTERS_LAYER_ID)) m.removeLayer(CLUSTERS_LAYER_ID);
  if (m.getLayer(UNCLUSTERED_PIN_LAYER)) m.removeLayer(UNCLUSTERED_PIN_LAYER);
  if (m.getSource('events-source')) m.removeSource('events-source');
}

const mapsWithHandlers = new WeakSet<mapboxgl.Map>();

export function appearanceToStyleUrl(appearance: MapAppearance): string {
  return STYLE_URLS[appearance] ?? STYLE_URLS.light;
}

export const BUILDINGS_LAYER_ID = '3d-buildings';
export const TERRAIN_SOURCE_ID = 'mapbox-dem';
export const MAP_3D_PITCH = 45;
const TERRAIN_EXAGGERATION = 1.4;

function addBuildingsLayer(m: mapboxgl.Map, appearance?: MapAppearance) {
  if (m.getLayer(BUILDINGS_LAYER_ID)) return;

  const satellite = appearance === 'satellite';
  const layers = m.getStyle().layers;
  const labelLayerId = layers?.find(
    (l) => l.type === 'symbol' && l.layout && (l.layout as Record<string, unknown>)['text-field']
  )?.id;

  m.addLayer(
    {
      id: BUILDINGS_LAYER_ID,
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': satellite ? '#6b6b6b' : '#aaa',
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'height']],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'min_height']],
        'fill-extrusion-opacity': satellite ? 0.45 : 0.6,
      },
    },
    labelLayerId
  );
}

/** Enable or disable terrain extrusion and 3D buildings (not just camera pitch). */
export function setMap3DMode(m: mapboxgl.Map, enabled: boolean, appearance?: MapAppearance) {
  if (enabled) {
    if (!m.getSource(TERRAIN_SOURCE_ID)) {
      m.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    m.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION });
    addBuildingsLayer(m, appearance);
    if (m.getLayer(BUILDINGS_LAYER_ID)) {
      m.setLayoutProperty(BUILDINGS_LAYER_ID, 'visibility', 'visible');
    }
    return;
  }

  m.setTerrain(null);
  if (m.getLayer(BUILDINGS_LAYER_ID)) {
    m.removeLayer(BUILDINGS_LAYER_ID);
  }
}

/** @deprecated use setMap3DMode */
export function enable3DExtras(m: mapboxgl.Map, pitch: number, appearance?: MapAppearance) {
  setMap3DMode(m, pitch > 0, appearance);
}

export function eventsToGeoJson(events: Event[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((event) => ({
      type: 'Feature',
      id: event.id,
      geometry: { type: 'Point', coordinates: [event.lng, event.lat] },
      properties: {
        ...event,
        color: categoryConfig[event.category]?.color || categoryConfig.other.color,
        emoji: categoryConfig[event.category]?.emoji || categoryConfig.other.emoji,
      },
    })),
  };
}

/** Layer definitions for events source — exported for tests */
export function buildEventLayerDefs(): mapboxgl.AnyLayer[] {
  return [
    {
      id: CLUSTERS_LAYER_ID,
      type: 'symbol',
      source: 'events-source',
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': EVENT_PIN_IMAGE_ID,
        'icon-anchor': 'bottom',
        'icon-size': ['step', ['get', 'point_count'], 0.9, 10, 1.1, 30, 1.25],
        'icon-allow-overlap': true,
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, -1.6],
        'text-allow-overlap': true,
      },
      paint: {
        'icon-color': '#F97316',
        'icon-halo-color': 'rgba(249, 115, 22, 0.35)',
        'icon-halo-width': 1.5,
        'text-color': '#ffffff',
      },
    },
    {
      id: UNCLUSTERED_PIN_LAYER,
      type: 'symbol',
      source: 'events-source',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': EVENT_PIN_IMAGE_ID,
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          0.85,
          12,
          0.95,
          14,
          1,
          16,
          [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1.2,
            1,
          ],
        ],
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': false,
      },
      paint: {
        'icon-color': '#F97316',
        'icon-halo-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#F97316',
          '#ffffff',
        ],
        'icon-halo-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          2.5,
          1.25,
        ],
        'icon-opacity': 0.95,
      },
    },
  ];
}

export function initEventLayers(
  m: mapboxgl.Map,
  initialGeoJson: GeoJSON.FeatureCollection,
  getEvents: () => Event[],
  getOnSelect: () => ((event: Event) => void) | undefined,
  eventCount = initialGeoJson.features.length
) {
  if (!m.hasImage(EVENT_PIN_IMAGE_ID)) {
    return;
  }

  const sourceSpec = buildEventsSourceClusterOptions(eventCount);

  if (!m.getSource('events-source')) {
    m.addSource('events-source', {
      type: 'geojson',
      data: initialGeoJson,
      ...sourceSpec,
    });
  } else {
    (m.getSource('events-source') as mapboxgl.GeoJSONSource).setData(initialGeoJson);
  }

  buildEventLayerDefs().forEach((layer) => {
    if (!m.getLayer(layer.id)) m.addLayer(layer);
  });

  if (mapsWithHandlers.has(m)) return;
  mapsWithHandlers.add(m);

  m.on('click', CLUSTERS_LAYER_ID, (e) => {
    const features = m.queryRenderedFeatures(e.point, { layers: [CLUSTERS_LAYER_ID] });
    const feature = features[0];
    if (!feature?.properties?.cluster_id) return;

    const clusterId = feature.properties.cluster_id as number;
    const source = m.getSource('events-source') as mapboxgl.GeoJSONSource;
    const geometry = feature.geometry as GeoJSON.Point;
    const center = geometry.coordinates as [number, number];

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || zoom == null) return;
      m.easeTo({ center, zoom });
    });
  });

  m.on('click', UNCLUSTERED_PIN_LAYER, (e) => {
    if (!e.features?.length) return;
    const hit = e.features[0];
    const geometry = hit.geometry as GeoJSON.Point;
    const coords = [...geometry.coordinates] as [number, number];
    const props = hit.properties;
    const resolved = resolveEventFromMapClick(getEvents(), props, coords);
    if (resolved) getOnSelect()?.(resolved);
  });

  m.on('mouseenter', CLUSTERS_LAYER_ID, () => {
    m.getCanvas().style.cursor = 'pointer';
  });
  m.on('mouseleave', CLUSTERS_LAYER_ID, () => {
    m.getCanvas().style.cursor = '';
  });
  m.on('mouseenter', UNCLUSTERED_PIN_LAYER, () => {
    m.getCanvas().style.cursor = 'pointer';
  });
  m.on('mouseleave', UNCLUSTERED_PIN_LAYER, () => {
    m.getCanvas().style.cursor = '';
  });
}
