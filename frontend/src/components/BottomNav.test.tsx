import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('switches tabs', () => {
    const onTabChange = vi.fn();
    const { getByRole } = render(
      <BottomNav activeTab="discover" onTabChange={onTabChange} savedCount={2} />
    );
    fireEvent.click(getByRole('button', { name: /Saved/i }));
    expect(onTabChange).toHaveBeenCalledWith('saved');
  });

  it('shows saved badge count', () => {
    const { getByText } = render(
      <BottomNav activeTab="discover" onTabChange={vi.fn()} savedCount={3} />
    );
    expect(getByText('3')).toBeInTheDocument();
  });

  it('marks active tab with aria-current', () => {
    const { getByRole } = render(
      <BottomNav activeTab="profile" onTabChange={vi.fn()} />
    );
    expect(getByRole('button', { name: /Profile/i })).toHaveAttribute('aria-current', 'page');
  });

  it('hides when hidden prop is true', () => {
    const { container } = render(
      <BottomNav activeTab="discover" onTabChange={vi.fn()} hidden />
    );
    expect(container.firstChild).toBeNull();
  });
});
