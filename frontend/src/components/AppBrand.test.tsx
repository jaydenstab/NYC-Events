import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppBrand from './AppBrand';

describe('AppBrand', () => {
  it('shows shown count and update link', () => {
    render(
      <AppBrand
        shownCount={38}
        dataSource="live"
        lastScrapeAt={new Date().toISOString()}
      />
    );
    expect(screen.getByText(/38 shown/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Updated/i })).toBeInTheDocument();
  });

  it('renders embedded desktop tabs when showDesktopTabs is true', () => {
    const onTabChange = vi.fn();
    render(
      <AppBrand
        shownCount={10}
        dataSource="live"
        showDesktopTabs
        activeTab="discover"
        onTabChange={onTabChange}
        savedCount={2}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Saved/i }));
    expect(onTabChange).toHaveBeenCalledWith('saved');
  });

  it('does not render desktop tabs when showDesktopTabs is false', () => {
    render(<AppBrand shownCount={10} dataSource="live" showDesktopTabs={false} />);
    expect(screen.queryByRole('navigation', { name: /Main navigation/i })).not.toBeInTheDocument();
  });
});
