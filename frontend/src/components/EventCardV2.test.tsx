import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventCardV2 from './EventCardV2';
import type { Event } from '@/types/Event';

const sample: Event = {
  id: '1',
  name: 'Jazz Night',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'Blue Note, Manhattan, NY',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: 'Live jazz',
};

describe('EventCardV2', () => {
  it('renders category label and title', () => {
    render(
      <div className="sidebar-dark">
        <EventCardV2
          event={sample}
          isSaved={false}
          onToggleSave={vi.fn()}
          onClick={vi.fn()}
        />
      </div>
    );
    expect(screen.getByText('MUSIC')).toBeInTheDocument();
    expect(screen.getByText('Jazz Night')).toBeInTheDocument();
  });

  it('calls onToggleSave when heart clicked', () => {
    const onToggleSave = vi.fn();
    render(
      <div className="sidebar-dark">
        <EventCardV2
          event={sample}
          isSaved={false}
          onToggleSave={onToggleSave}
          onClick={vi.fn()}
        />
      </div>
    );
    fireEvent.click(screen.getByLabelText('Save Jazz Night'));
    expect(onToggleSave).toHaveBeenCalledWith('1');
  });

  it('does not open the card when heart is clicked', () => {
    const onToggleSave = vi.fn();
    const onClick = vi.fn();
    render(
      <div className="sidebar-dark">
        <EventCardV2
          event={sample}
          isSaved={false}
          onToggleSave={onToggleSave}
          onClick={onClick}
        />
      </div>
    );
    fireEvent.click(screen.getByLabelText('Save Jazz Night'));
    expect(onToggleSave).toHaveBeenCalledWith('1');
    expect(onClick).not.toHaveBeenCalled();
  });
});
