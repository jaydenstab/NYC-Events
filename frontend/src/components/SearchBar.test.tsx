import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('shows recent searches and clears them', () => {
    const onClearRecent = vi.fn();
    const { getByRole, getByText } = render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        recentSearches={['jazz']}
        searchFocused
        onClearRecent={onClearRecent}
      />
    );
    expect(getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(getByText('Clear recent'));
    expect(onClearRecent).toHaveBeenCalled();
  });
});
