import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';
import type { Event } from '@/types/Event';

const sampleEvent: Event = {
  id: 'test-1',
  name: 'Jazz at the Park',
  description: 'Outdoor jazz',
  address: 'Central Park, NY',
  time: '7:00 PM',
  date: '2099-07-04',
  price: 'Free',
  category: 'music',
  lat: 40.78,
  lng: -73.96,
  website: null,
  source: 'test',
  locationQuality: 'geocoded',
};

describe('EventCard', () => {
  it('renders title, date, and category', () => {
    render(
      <EventCard
        event={sampleEvent}
        isSaved={false}
        onToggleSave={vi.fn()}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Jazz at the Park')).toBeInTheDocument();
    expect(screen.getByText(/7:00 PM/)).toBeInTheDocument();
    expect(screen.getByText(/music/i)).toBeInTheDocument();
  });
});
