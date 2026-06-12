import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NYC3DMap from './NYC3DMap';
import type { Event } from '@/types/Event';
import { ensureEventPinImage } from '@/lib/mapPinImage';

vi.mock('@/lib/mapPinImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mapPinImage')>();
  return {
    ...actual,
    ensureEventPinImage: vi.fn(actual.ensureEventPinImage),
  };
});

vi.mock('mapbox-gl', () => {
  const Map = vi.fn().mockImplementation(() => ({
    on: vi.fn((event, cb) => {
      if (event === 'load' && typeof cb === 'function') cb();
    }),
    once: vi.fn((event, cb) => {
      if (event === 'style.load' && typeof cb === 'function') cb();
    }),
    remove: vi.fn(),
    addControl: vi.fn(),
    getSource: vi.fn(() => ({ setData: vi.fn() })),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(),
    getStyle: vi.fn(() => ({ layers: [], sprite: '' })),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    fitBounds: vi.fn(),
    resize: vi.fn(),
    setStyle: vi.fn(),
    setFeatureState: vi.fn(),
    setTerrain: vi.fn(),
    getTerrain: vi.fn(() => null),
    setPaintProperty: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    hasImage: vi.fn(() => true),
    addImage: vi.fn(),
  }));
  return {
    default: {
      Map,
      accessToken: '',
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
      LngLatBounds: vi.fn().mockImplementation(() => ({
        extend: vi.fn(),
      })),
    },
  };
});

const sampleEvent: Event = {
  id: 'map-1',
  name: 'Map Test',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: 'Test',
};

describe('NYC3DMap', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN', 'pk.test');
    vi.mocked(ensureEventPinImage).mockImplementation(async () => undefined);
  });

  it('renders without crashing', () => {
    const { container } = render(
      <NYC3DMap events={[sampleEvent]} onEventSelect={vi.fn()} appearance="light" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows map error when pin sprite fails to load', async () => {
    vi.mocked(ensureEventPinImage).mockRejectedValueOnce(new Error('sprite failed'));

    render(<NYC3DMap events={[sampleEvent]} onEventSelect={vi.fn()} appearance="light" />);

    await waitFor(() => {
      expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Could not load map markers. Refresh the page.')).toBeInTheDocument();
    });
  });
});
