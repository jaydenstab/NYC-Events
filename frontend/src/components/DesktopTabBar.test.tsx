import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DesktopTabBar from './DesktopTabBar';

describe('DesktopTabBar', () => {
  it('marks active tab with aria-current', () => {
    render(
      <DesktopTabBar activeTab="profile" onTabChange={vi.fn()} savedCount={1} embedded />
    );
    expect(screen.getByRole('button', { name: /Profile/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses embedded spacing classes', () => {
    const { container } = render(
      <DesktopTabBar activeTab="discover" onTabChange={vi.fn()} embedded />
    );
    const nav = container.querySelector('nav');
    expect(nav?.className).toMatch(/mt-2/);
    expect(nav?.className).not.toMatch(/px-5/);
  });

  it('calls onTabChange when tab clicked', () => {
    const onTabChange = vi.fn();
    render(<DesktopTabBar activeTab="discover" onTabChange={onTabChange} savedCount={3} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved/i }));
    expect(onTabChange).toHaveBeenCalledWith('saved');
  });
});
