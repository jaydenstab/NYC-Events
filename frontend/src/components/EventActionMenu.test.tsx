import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EventActionMenu from './EventActionMenu';
import type { Event } from '@/types/Event';

const sampleEvent: Event = {
  id: 'menu-1',
  name: 'Sample',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-08-01',
  price: 'Free',
  description: 'Test',
};

describe('EventActionMenu', () => {
  it('opens menu on click', () => {
    const { getByLabelText, getByRole, getByText } = render(
      <EventActionMenu
        event={sampleEvent}
        linkCopied={false}
        addressCopied={false}
        onLinkCopied={vi.fn()}
        onAddressCopied={vi.fn()}
      />
    );
    fireEvent.click(getByLabelText('More actions'));
    expect(getByRole('menu')).toBeInTheDocument();
    expect(getByText('Copy link')).toBeInTheDocument();
  });

  it('closes menu on Escape', () => {
    const { getByLabelText, queryByRole } = render(
      <EventActionMenu
        event={sampleEvent}
        linkCopied={false}
        addressCopied={false}
        onLinkCopied={vi.fn()}
        onAddressCopied={vi.fn()}
      />
    );
    fireEvent.click(getByLabelText('More actions'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByRole('menu')).not.toBeInTheDocument();
  });
});
