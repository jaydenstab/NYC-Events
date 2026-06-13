import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickShortcuts from './QuickShortcuts';

describe('QuickShortcuts', () => {
  it('renders Tonight and This weekend controls', () => {
    render(
      <QuickShortcuts selectedDateRange="all" onDateRangeChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /Tonight/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This weekend/i })).toBeInTheDocument();
  });

  it('uses solid orange styling when Tonight is active', () => {
    render(
      <QuickShortcuts selectedDateRange="today" onDateRangeChange={vi.fn()} />
    );
    const tonight = screen.getByRole('button', { name: /Tonight/i });
    expect(tonight.className).toMatch(/bg-primary/);
  });

  it('highlights Tonight via browse scroll-spy section', () => {
    render(
      <QuickShortcuts
        selectedDateRange="all"
        onDateRangeChange={vi.fn()}
        browseMode
        activeBrowseSection="tonight"
        onScrollToSection={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Tonight/i }).className).toMatch(/bg-primary/);
  });

  it('toggles date range on click', () => {
    const onDateRangeChange = vi.fn();
    render(
      <QuickShortcuts selectedDateRange="all" onDateRangeChange={onDateRangeChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Tonight/i }));
    expect(onDateRangeChange).toHaveBeenCalledWith('today');
  });

  it('scrolls to browse sections instead of applying filters in browse mode', () => {
    const onDateRangeChange = vi.fn();
    const onScrollToSection = vi.fn();
    render(
      <QuickShortcuts
        selectedDateRange="all"
        onDateRangeChange={onDateRangeChange}
        browseMode
        onScrollToSection={onScrollToSection}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Tonight/i }));
    expect(onScrollToSection).toHaveBeenCalledWith('tonight');
    expect(onDateRangeChange).not.toHaveBeenCalled();
  });

  it('does not add horizontal padding on root element', () => {
    const { container } = render(
      <QuickShortcuts selectedDateRange="all" onDateRangeChange={vi.fn()} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/px-5/);
  });
});
