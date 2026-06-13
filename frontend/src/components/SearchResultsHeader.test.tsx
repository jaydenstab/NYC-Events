import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchResultsHeader from './SearchResultsHeader';

describe('SearchResultsHeader', () => {
  it('renders nothing when search query is too short', () => {
    const { container } = render(
      <SearchResultsHeader searchQuery="j" eventsCount={5} sort="date" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows searching state', () => {
    render(
      <SearchResultsHeader
        searchQuery="jazz"
        eventsCount={0}
        searchLoading
        sort="relevance"
      />
    );
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('shows result count for active search', () => {
    render(
      <SearchResultsHeader
        searchQuery="jazz"
        eventsCount={3}
        sort="date"
        isSearching
        searchTotalCount={10}
      />
    );
    expect(screen.getByText(/3 of 10 results for .jazz./i)).toBeInTheDocument();
  });

  it('shows catalog note when search active and catalog not fully loaded', () => {
    render(
      <SearchResultsHeader
        searchQuery="jazz"
        eventsCount={3}
        sort="date"
        isSearching
        showSearchCatalogNote
      />
    );
    expect(screen.getByText(/Search runs the full index/i)).toBeInTheDocument();
  });

  it('does not add horizontal padding on root container', () => {
    const { container } = render(
      <SearchResultsHeader searchQuery="jazz" eventsCount={3} sort="date" />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/px-5/);
  });
});
