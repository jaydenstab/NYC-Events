import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchEvents, fetchEventsByIds, toUiEvent, EVENTS_PER_PAGE } from './api';

describe('fetchEvents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends x-api-key header when VITE_API_KEY is set', async () => {
    vi.stubEnv('VITE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, events: [], meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchEvents();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
  });

  it('requests paginated list by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, events: [], meta: { totalCount: 0, page: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchEvents();

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`page=1`);
    expect(url).toContain(`per_page=${EVENTS_PER_PAGE}`);
  });

  it('requests page 2 when paginate options set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, events: [], meta: { totalCount: 200, page: 2 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchEvents({ page: 2, paginate: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('page=2');
    expect(url).toContain(`per_page=${EVENTS_PER_PAGE}`);
  });

  it('omits pagination when searching', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, events: [], meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchEvents({ search: 'jazz' });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=jazz');
    expect(url).not.toContain('page=');
  });

  it('builds query string for search and semantic', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        events: [
          {
            id: 'a1',
            name: 'Test',
            category: 'Music',
            latitude: 40.7,
            longitude: -74.0,
            address: 'NYC',
            startTime: '7pm',
            date: '2099-01-01',
            price: 'Free',
            description: 'Desc',
          },
        ],
        meta: { semanticIndexReady: true, totalCount: 1 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchEvents({ search: 'jazz', semantic: true });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=jazz');
    expect(url).toContain('semantic=true');
  });

  it('keeps events with TBD date in filterFutureEvents path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        events: [
          {
            id: 'tbd1',
            name: 'TBD Show',
            category: 'Music',
            latitude: 40.7,
            longitude: -74,
            address: 'NYC',
            startTime: '8pm',
            date: 'TBD',
            price: 'Free',
            description: 'D',
          },
        ],
        meta: { totalCount: 1 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { events } = await fetchEvents();
    expect(events.length).toBe(1);
    expect(events[0].name).toBe('TBD Show');
  });

  it('toUiEvent sets default locationQuality when coords missing', () => {
    const ui = toUiEvent(
      {
        id: 'x',
        name: 'Show',
        category: 'Music',
        address: 'NYC',
        startTime: '8pm',
        date: '2026-01-01',
        price: '$10',
        description: 'D',
      },
      0
    );
    expect(ui.lat).toBe(40.7282);
    expect(ui.locationQuality).toBe('default');
  });

  it('toUiEvent classifies Google search website as search link', () => {
    const ui = toUiEvent(
      {
        id: 'x',
        name: 'Show',
        category: 'Music',
        website: 'https://www.google.com/search?q=show+nyc',
        latitude: 40.1,
        longitude: -73.9,
        address: 'NYC',
        startTime: '8pm',
        date: '2026-01-01',
        price: '$10',
        description: 'D',
      },
      0
    );
    expect(ui.linkKind).toBe('search');
  });

  it('fetchEventsByIds requests ids query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        events: [{ id: 'a1', name: 'A', category: 'Music', latitude: 40.7, longitude: -74, address: 'NYC', startTime: '8pm', date: '2099-01-01', price: 'Free', description: 'D' }],
        meta: { totalCount: 1, idsMode: true },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { events } = await fetchEventsByIds(['a1']);
    expect(events).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('ids=a1');
  });

  it('toUiEvent maps backend fields', () => {
    const ui = toUiEvent(
      {
        id: 'x',
        name: 'Show',
        category: 'Music',
        latitude: 40.1,
        longitude: -73.9,
        address: 'NYC',
        startTime: '8pm',
        date: '2026-01-01',
        price: '$10',
        description: 'D',
        locationQuality: 'geocoded',
        score: 0.9,
      },
      0
    );
    expect(ui.lat).toBe(40.1);
    expect(ui.locationQuality).toBe('geocoded');
    expect(ui.score).toBe(0.9);
  });
});
