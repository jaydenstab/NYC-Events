import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CollapsedSidebarRail from './CollapsedSidebarRail';

describe('CollapsedSidebarRail', () => {
  it('renders tab navigation and expand controls', () => {
    const onTabChange = vi.fn();
    const onExpand = vi.fn();
    render(
      <CollapsedSidebarRail
        activeTab="discover"
        savedCount={2}
        onTabChange={onTabChange}
        onExpand={onExpand}
        onExpandAndFocusSearch={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Discover')).toBeInTheDocument();
    expect(screen.getByLabelText('Saved')).toBeInTheDocument();
    expect(screen.getByLabelText('Search events')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Expand sidebar')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Saved'));
    expect(onTabChange).toHaveBeenCalledWith('saved');
  });
});
