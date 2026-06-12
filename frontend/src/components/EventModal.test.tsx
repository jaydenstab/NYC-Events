import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventModal from './EventModal';
import type { Event } from '@/types/Event';

const sampleEvent: Event = {
  id: 'modal-1',
  name: 'Summer Concert',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'Central Park, Manhattan, NY',
  time: '7:00 PM',
  date: '2099-08-01',
  price: 'Free',
  description: 'Outdoor concert in the park.',
  locationQuality: 'geocoded',
};

describe('EventModal', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <EventModal
        event={sampleEvent}
        onClose={onClose}
        isMobile={false}
        isSaved={false}
        onToggleSave={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows event not found state', () => {
    render(
      <EventModal
        event={null}
        eventNotFound
        onClose={vi.fn()}
        isMobile={false}
        isSaved={false}
        onToggleSave={vi.fn()}
      />
    );
    expect(screen.getByText('Event not found')).toBeInTheDocument();
  });

  it('renders overflow menu with calendar when date is valid', () => {
    render(
      <EventModal
        event={sampleEvent}
        onClose={vi.fn()}
        isMobile={false}
        isSaved={false}
        onToggleSave={vi.fn()}
      />
    );
    expect(screen.getAllByLabelText('More actions').length).toBeGreaterThan(0);
  });

  it('renders hero image when imageUrl is set', () => {
    const { container } = render(
      <EventModal
        event={{ ...sampleEvent, imageUrl: 'https://example.com/photo.jpg' }}
        onClose={vi.fn()}
        isMobile={false}
        isSaved={false}
        onToggleSave={vi.fn()}
      />
    );
    expect(container.querySelector('img[src="https://example.com/photo.jpg"]')).toBeTruthy();
  });

  it('has single save control on mobile (bottom bar only)', () => {
    const { container } = render(
      <EventModal
        event={sampleEvent}
        onClose={vi.fn()}
        isMobile={true}
        isSaved={false}
        onToggleSave={vi.fn()}
      />
    );
    expect(container.querySelector('.absolute.top-5.left-5')).toBeNull();
    expect(screen.getAllByLabelText('Save event').length).toBeGreaterThanOrEqual(1);
  });
});
