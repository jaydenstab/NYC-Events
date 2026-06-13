import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventsPanel from './EventsPanel';
import type { Event } from '@/types/Event';

const sampleEvents: Event[] = [
  {
    id: '1',
    name: 'Jazz Night',
    category: 'music',
    lat: 40.75,
    lng: -73.99,
    address: 'Manhattan, NY',
    time: '8pm',
    date: '2099-01-01',
    price: 'Free',
    description: 'Live jazz',
  },
  {
    id: '2',
    name: 'Art Walk',
    category: 'art',
    lat: 40.71,
    lng: -74.0,
    address: 'Brooklyn, NY',
    time: '2pm',
    date: '2099-01-02',
    price: '$10',
    description: 'Gallery tour',
  },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof EventsPanel>> = {}) {
  const defaultProps = {
    events: sampleEvents,
    isExpanded: true,
    onToggleExpand: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedCategory: 'all',
    onCategoryChange: vi.fn(),
    selectedDateRange: 'all',
    onDateRangeChange: vi.fn(),
    selectedBorough: 'all',
    onBoroughChange: vi.fn(),
    selectedPrice: 'all' as const,
    onPriceChange: vi.fn(),
    selectedTimeOfDay: 'all' as const,
    onTimeOfDayChange: vi.fn(),
    sort: 'date' as const,
    onSortChange: vi.fn(),
    onEventClick: vi.fn(),
    isMobile: false,
    savedEventIds: [],
    isEventSaved: () => false,
    onToggleSave: vi.fn(),
    searchLoading: false,
    dataSource: 'live' as const,
    semanticFallback: false,
    semanticIndexing: false,
    onClearAllFilters: vi.fn(),
    onRemoveSearch: vi.fn(),
    onRemoveCategory: vi.fn(),
    onRemoveDate: vi.fn(),
    onRemoveSaved: vi.fn(),
    onRemoveBorough: vi.fn(),
    onRemovePrice: vi.fn(),
    onRemoveTimeOfDay: vi.fn(),
    ...overrides,
  };
  const utils = render(<EventsPanel {...defaultProps} />);
  return { ...utils, props: defaultProps };
}

describe('EventsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders event count and cards when expanded', () => {
    renderPanel();
    expect(screen.getByText(/2 shown/i)).toBeInTheDocument();
    expect(screen.getByLabelText('View Jazz Night')).toBeInTheDocument();
    expect(screen.getByLabelText('View Art Walk')).toBeInTheDocument();
  });

  it('keeps search sticky outside scroll container', () => {
    const { container } = renderPanel();
    expect(container.querySelector('[data-testid="sticky-search"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="panel-scroll"]')).toBeTruthy();
    const sticky = container.querySelector('[data-testid="sticky-search"]');
    const scroll = container.querySelector('[data-testid="panel-scroll"]');
    expect(sticky && scroll && sticky.compareDocumentPosition(scroll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows load more when hasMore and onLoadMore provided', () => {
    const onLoadMore = vi.fn();
    renderPanel({
      liveTotalCount: 100,
      hasMore: true,
      onLoadMore,
      selectedDateRange: 'today',
    });
    fireEvent.click(screen.getByRole('button', { name: /Load more/i }));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('renders FilterSheet trigger in search bar', () => {
    renderPanel({ isMobile: true });
    expect(screen.getByLabelText(/^Filters/i)).toBeInTheDocument();
  });

  it('shows WhatsUpNYC brand title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WhatsUpNYC');
  });

  it('shows search input value from props', () => {
    const { container } = renderPanel({ searchQuery: 'jazz' });
    const input = container.querySelector('#events-search') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('jazz');
  });

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    const { container } = renderPanel({ onSearchChange });
    const input = container.querySelector('#events-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'comedy' } });
    expect(onSearchChange).toHaveBeenCalledWith('comedy');
  });

  it('shows empty state message when no events', () => {
    renderPanel({ events: [], selectedCategory: 'comedy' });
    expect(screen.getByText(/No comedy events found/i)).toBeInTheDocument();
  });

  it('keeps filter chips in sticky zone outside scroll container when filters active', () => {
    const { container } = renderPanel({ searchQuery: 'jazz' });
    const stickyZone = container.querySelector('[data-testid="sticky-zone"]');
    const scroll = container.querySelector('[data-testid="panel-scroll"]');
    expect(stickyZone).toBeTruthy();
    expect(scroll).toBeTruthy();
    expect(stickyZone?.textContent).toMatch(/jazz/i);
    expect(
      stickyZone &&
        scroll &&
        stickyZone.compareDocumentPosition(scroll) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows sectioned browse feed in default discover mode', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;
    renderPanel({
      events: [{ ...sampleEvents[0], date: todayIso }],
      selectedDateRange: 'all',
      activeTab: 'discover',
    });
    expect(screen.getByRole('region', { name: /Tonight/i })).toBeInTheDocument();
  });

  it('does not show sticky sort control on discover tab', () => {
    const { container } = renderPanel({ activeTab: 'discover' });
    const stickyZone = container.querySelector('[data-testid="sticky-zone"]');
    expect(stickyZone?.querySelector('#event-sort')).toBeNull();
  });

  it('aligns chip row with search inset', () => {
    const { container } = renderPanel({ activeTab: 'discover' });
    const search = container.querySelector('[data-testid="sticky-search"]');
    const chipRow = container.querySelector('[data-testid="sticky-zone"] > .px-5');
    expect(search?.className).toMatch(/px-5/);
    expect(chipRow).toBeTruthy();
  });

  it('hides date shortcuts on saved tab', () => {
    renderPanel({ activeTab: 'saved', selectedCategory: 'saved' });
    expect(screen.queryByRole('button', { name: /Tonight/i })).not.toBeInTheDocument();
  });

  it('renders collapsed sidebar rail when not expanded on desktop', () => {
    renderPanel({ isExpanded: false, isMobile: false });
    expect(screen.getByLabelText('Collapsed sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Discover')).toBeInTheDocument();
  });

  it('expands panel when Saved is clicked from collapsed rail', () => {
    const onToggleExpand = vi.fn();
    const onTabChange = vi.fn();
    renderPanel({
      isExpanded: false,
      isMobile: false,
      onToggleExpand,
      onTabChange,
    });
    fireEvent.click(screen.getByLabelText('Saved'));
    expect(onToggleExpand).toHaveBeenCalled();
    expect(onTabChange).toHaveBeenCalledWith('saved');
  });

  it('does not expand panel when Discover is clicked from collapsed rail', () => {
    const onToggleExpand = vi.fn();
    renderPanel({
      isExpanded: false,
      isMobile: false,
      onToggleExpand,
    });
    fireEvent.click(screen.getByLabelText('Discover'));
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  it('shows filtered list header when date filter is active', () => {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    renderPanel({
      events: [{ ...sampleEvents[0], date: todayIso }],
      selectedDateRange: 'today',
      activeTab: 'discover',
    });
    expect(screen.getByRole('heading', { level: 2, name: /Tonight · 1 event/i })).toBeInTheDocument();
  });
});
