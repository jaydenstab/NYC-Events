import mapboxgl from 'mapbox-gl';
import type { Event } from '@/types/Event';
import { categoryConfig } from '@/types/Event';
import { resolveEventFromMapClick } from '@/lib/mapEventResolver';
import type { MapAppearance } from '@/hooks/useMapPreferences';
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

const mapsWithHandlers = new WeakSet<mapboxgl.Map>();

export function appearanceToStyleUrl(appearance: MapAppearance): string {
  return STYLE_URLS[appearance] ?? STYLE_URLS.light;
}

export function enable3DExtras(m: mapboxgl.Map, pitch: number) {
  if (!m.getSource('mapbox-dem')) {
    m.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
    m.setTerrain({ source: 'mapbox-dem', exaggeration: pitch > 0 ? 1.4 : 0 });
  }

  if (pitch > 0 && !m.getLayer('3d-buildings')) {
    const layers = m.getStyle().layers;
    const labelLayerId = layers?.find(
      (l) => l.type === 'symbol' && l.layout && (l.layout as Record<string, unknown>)['text-field']
    )?.id;

    m.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.6,
        },
      },
      labelLayerId
    );
  }
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
        'icon-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 30, '#f28cb1'],
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 1.5,
        'text-color': '#1a1a1a',
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
        'icon-color': ['get', 'color'],
        'icon-halo-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#3b82f6',
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
  getOnSelect: () => ((event: Event) => void) | undefined
) {
  if (!m.hasImage(EVENT_PIN_IMAGE_ID)) {
    return;
  }

  if (!m.getSource('events-source')) {
    m.addSource('events-source', {
      type: 'geojson',
      data: initialGeoJson,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
      promoteId: 'id',
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
