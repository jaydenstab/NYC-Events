import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FilterSheet from './FilterSheet';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  activeCount: 0,
  sort: 'date' as const,
  onSortChange: vi.fn(),
  hasSearchQuery: false,
  hasUserLocation: false,
  selectedBorough: 'all',
  onBoroughChange: vi.fn(),
  selectedCategory: 'all',
  onCategoryChange: vi.fn(),
  selectedTimeOfDay: 'all' as const,
  onTimeOfDayChange: vi.fn(),
};

function renderInTheme(theme: 'dark' | 'light') {
  return render(
    <div className={`app-theme-${theme}`}>
      <FilterSheet {...defaultProps} />
    </div>
  );
}

describe('FilterSheet', () => {
  it('uses elevated surface tokens on drawer in dark theme', () => {
    renderInTheme('dark');
    const drawer = screen.getByRole('dialog', { hidden: true });
    expect(drawer.className).toMatch(/bg-surface-elevated/);
  });

  it('uses elevated surface tokens on drawer in light theme', () => {
    renderInTheme('light');
    const drawer = screen.getByRole('dialog', { hidden: true });
    expect(drawer.className).toMatch(/bg-surface-elevated/);
  });

  it('shows active filter count on trigger', () => {
    render(
      <div className="app-theme-dark">
        <FilterSheet {...defaultProps} open={false} activeCount={2} />
      </div>
    );
    expect(screen.getByLabelText(/Filters, 2 active/i)).toBeInTheDocument();
  });
});
