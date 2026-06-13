import { describe, it, expect, vi } from 'vitest';
import {
  BUILDINGS_LAYER_ID,
  CLUSTER_DISABLE_THRESHOLD,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTERS_LAYER_ID,
  TERRAIN_SOURCE_ID,
  UNCLUSTERED_PIN_LAYER,
  buildEventLayerDefs,
  setMap3DMode,
  shouldClusterEvents,
} from './mapLayers';
import { EVENT_PIN_IMAGE_ID } from './mapPinImage';

describe('mapLayers', () => {
  it('exports cluster tuning constants', () => {
    expect(CLUSTER_MAX_ZOOM).toBe(12);
    expect(CLUSTER_RADIUS).toBe(30);
    expect(CLUSTER_DISABLE_THRESHOLD).toBe(10);
  });

  it('disables clustering for small result sets', () => {
    expect(shouldClusterEvents(10)).toBe(false);
    expect(shouldClusterEvents(11)).toBe(true);
  });

  it('defines clusters as a symbol layer with pin icon and count text', () => {
    const layers = buildEventLayerDefs();
    const clusters = layers.find((l) => l.id === CLUSTERS_LAYER_ID) as {
      type: string;
      layout?: Record<string, unknown>;
      filter?: unknown;
    };

    expect(clusters).toBeDefined();
    expect(clusters.type).toBe('symbol');
    expect(clusters.layout?.['icon-image']).toBe(EVENT_PIN_IMAGE_ID);
    expect(clusters.layout?.['text-field']).toBe('{point_count_abbreviated}');
    expect(clusters.filter).toEqual(['has', 'point_count']);
  });

  it('does not include a separate cluster-count layer', () => {
    const layers = buildEventLayerDefs();
    expect(layers.some((l) => l.id === 'cluster-count')).toBe(false);
    expect(layers).toHaveLength(2);
  });

  it('defines orange cluster pins', () => {
    const layers = buildEventLayerDefs();
    const clusters = layers.find((l) => l.id === CLUSTERS_LAYER_ID) as {
      paint?: Record<string, unknown>;
    };

    expect(clusters?.paint?.['icon-color']).toBe('#F97316');
    expect(clusters?.paint?.['text-color']).toBe('#ffffff');
  });

  it('defines orange unclustered pins with selection halo', () => {
    const pin = buildEventLayerDefs().find((l) => l.id === UNCLUSTERED_PIN_LAYER) as {
      paint?: Record<string, unknown>;
    };

    expect(pin?.paint?.['icon-color']).toBe('#F97316');
  });

  it('enables terrain and buildings when 3D mode is on', () => {
    const setTerrain = vi.fn();
    const addSource = vi.fn();
    const addLayer = vi.fn();
    const getLayer = vi.fn().mockReturnValue(null);
    const getSource = vi.fn().mockReturnValue(null);
    const setLayoutProperty = vi.fn();
    const map = {
      getSource,
      addSource,
      setTerrain,
      getLayer,
      addLayer,
      setLayoutProperty,
      getStyle: () => ({ layers: [{ id: 'labels', type: 'symbol', layout: { 'text-field': 'x' } }] }),
    } as unknown as import('mapbox-gl').Map;

    setMap3DMode(map, true, 'satellite');

    expect(addSource).toHaveBeenCalledWith(TERRAIN_SOURCE_ID, expect.any(Object));
    expect(setTerrain).toHaveBeenCalledWith({ source: TERRAIN_SOURCE_ID, exaggeration: 1.4 });
    expect(addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: BUILDINGS_LAYER_ID, type: 'fill-extrusion' }),
      'labels'
    );
  });

  it('removes terrain and buildings when 3D mode is off', () => {
    const setTerrain = vi.fn();
    const removeLayer = vi.fn();
    const getLayer = vi.fn().mockReturnValue({});
    const map = {
      getSource: vi.fn().mockReturnValue({}),
      setTerrain,
      getLayer,
      removeLayer,
    } as unknown as import('mapbox-gl').Map;

    setMap3DMode(map, false);

    expect(setTerrain).toHaveBeenCalledWith(null);
    expect(removeLayer).toHaveBeenCalledWith(BUILDINGS_LAYER_ID);
  });
});
