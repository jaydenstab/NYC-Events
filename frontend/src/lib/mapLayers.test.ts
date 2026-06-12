import { describe, it, expect } from 'vitest';
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTERS_LAYER_ID,
  UNCLUSTERED_PIN_LAYER,
  buildEventLayerDefs,
} from './mapLayers';
import { EVENT_PIN_IMAGE_ID } from './mapPinImage';

describe('mapLayers', () => {
  it('exports cluster tuning constants', () => {
    expect(CLUSTER_MAX_ZOOM).toBe(12);
    expect(CLUSTER_RADIUS).toBe(30);
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

  it('includes unclustered pin layer with zoom-based icon sizing', () => {
    const pin = buildEventLayerDefs().find((l) => l.id === UNCLUSTERED_PIN_LAYER) as {
      type: string;
      layout?: Record<string, unknown>;
    };

    expect(pin.type).toBe('symbol');
    expect(pin.layout?.['icon-size']).toEqual(
      expect.arrayContaining(['interpolate', ['linear'], ['zoom'], 10, 0.85, 12, 0.95])
    );
  });
});
