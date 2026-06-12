import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
        onToggleSettings={vi.fn()}
        onToggleListOnly={vi.fn()}
      />
    );
    expect(screen.getByTestId('map-fab-menu')).toBeInTheDocument();
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
        onToggleSettings={vi.fn()}
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
        onToggleSettings={vi.fn()}
        onToggleListOnly={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
