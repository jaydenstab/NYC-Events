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
    renderPanel({ liveTotalCount: 100, hasMore: true, onLoadMore });
    fireEvent.click(screen.getByText('Load more events'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('renders FilterSheet trigger on mobile', () => {
    renderPanel({ isMobile: true });
    expect(screen.getAllByLabelText(/Filters/i).length).toBeGreaterThan(0);
  });

  it('shows WhatsUpNYC brand title', () => {
    renderPanel();
    expect(screen.getAllByText('WhatsUpNYC').length).toBeGreaterThan(0);
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

  it('keeps filter chips in sticky zone outside scroll container', () => {
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
});
