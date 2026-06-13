import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MapFabMenu from './MapFabMenu';

describe('MapFabMenu', () => {
  it('renders when visible on mobile', () => {
    render(
      <MapFabMenu
        isMobile
        visible
        eventCount={12}
        listOnlyMode={false}
        onBrowseEvents={vi.fn()}
        onOpenProfile={vi.fn()}
        onToggleListOnly={vi.fn()}
      />
    );
    expect(document.querySelector('[data-testid="map-fab-menu"]')).toBeTruthy();
  });

  it('opens menu and calls browse handler', () => {
    const onBrowseEvents = vi.fn();
    const { getByLabelText, getByText } = render(
      <MapFabMenu
        isMobile
        visible
        eventCount={5}
        listOnlyMode={false}
        onBrowseEvents={onBrowseEvents}
        onOpenProfile={vi.fn()}
        onToggleListOnly={vi.fn()}
      />
    );
    fireEvent.click(getByLabelText('Open map menu'));
    fireEvent.click(getByText(/Browse events/i));
    expect(onBrowseEvents).toHaveBeenCalled();
  });

  it('hides when not visible', () => {
    const { container } = render(
      <MapFabMenu
        isMobile
        visible={false}
        eventCount={5}
        listOnlyMode={false}
        onBrowseEvents={vi.fn()}
        onOpenProfile={vi.fn()}
        onToggleListOnly={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
