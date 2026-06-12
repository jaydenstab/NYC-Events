import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryFilters from './CategoryFilters';

describe('CategoryFilters', () => {
  it('calls onCategoryChange when a filter is clicked', () => {
    const onCategoryChange = vi.fn();
    render(
      <CategoryFilters selectedCategory="all" onCategoryChange={onCategoryChange} />
    );

    const musicButton = screen.getByRole('radio', { name: /music/i });
    fireEvent.click(musicButton);
    expect(onCategoryChange).toHaveBeenCalled();
  });
});
