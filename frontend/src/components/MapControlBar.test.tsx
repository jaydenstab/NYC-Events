import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapControlBar from './MapControlBar';
import type { NYC3DMapHandle } from './NYC3DMap';

describe('MapControlBar', () => {
  const zoomIn = vi.fn();
  const zoomOut = vi.fn();
  const resetNorth = vi.fn();
  const mapRef = {
    current: { zoomIn, zoomOut, resetNorth } as unknown as NYC3DMapHandle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the map control group', () => {
    render(
      <MapControlBar mapRef={mapRef} is3D={false} onIs3DChange={vi.fn()} />
    );
    expect(screen.getByLabelText('Map controls')).toBeInTheDocument();
  });

  it('toggles 3D mode and reflects aria-pressed', () => {
    const onIs3DChange = vi.fn();
    const { rerender } = render(
      <MapControlBar mapRef={mapRef} is3D={false} onIs3DChange={onIs3DChange} />
    );

    const toggle = screen.getByLabelText('Switch to 3D map with buildings and terrain');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(onIs3DChange).toHaveBeenCalledWith(true);

    rerender(<MapControlBar mapRef={mapRef} is3D={true} onIs3DChange={onIs3DChange} />);
    expect(
      screen.getByLabelText('Switch to 2D map')
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls zoom handlers on map ref', () => {
    render(
      <MapControlBar mapRef={mapRef} is3D={false} onIs3DChange={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Zoom out'));

    expect(zoomIn).toHaveBeenCalled();
    expect(zoomOut).toHaveBeenCalled();
  });

  it('updates fullscreen label when fullscreenchange fires', () => {
    render(
      <MapControlBar mapRef={mapRef} is3D={false} onIs3DChange={vi.fn()} />
    );

    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => document.documentElement,
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
  });

  it('returns null when hidden', () => {
    const { container } = render(
      <MapControlBar mapRef={mapRef} is3D={false} onIs3DChange={vi.fn()} hidden />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
