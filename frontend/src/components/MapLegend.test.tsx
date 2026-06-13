import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapLegend from './MapLegend';

describe('MapLegend', () => {
  it('renders nothing when eventCount is zero', () => {
    const { container } = render(<MapLegend eventCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(<MapLegend eventCount={5} hidden />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows event count on map', () => {
    render(<MapLegend eventCount={3} />);
    expect(screen.getByText('3 events on map')).toBeInTheDocument();
  });

  it('uses singular label for one event', () => {
    render(<MapLegend eventCount={1} />);
    expect(screen.getByText('1 event on map')).toBeInTheDocument();
  });
});
