import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscoverySuggestions from './DiscoverySuggestions';
import { EXAMPLE_SEARCHES } from '@/lib/discovery';

describe('DiscoverySuggestions', () => {
  it('renders example searches', () => {
    render(<DiscoverySuggestions onSelect={vi.fn()} />);
    for (const q of EXAMPLE_SEARCHES) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  it('calls onSelect when chip clicked', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(<DiscoverySuggestions onSelect={onSelect} />);
    fireEvent.click(getByRole('button', { name: EXAMPLE_SEARCHES[0] }));
    expect(onSelect).toHaveBeenCalledWith(EXAMPLE_SEARCHES[0]);
  });
});
