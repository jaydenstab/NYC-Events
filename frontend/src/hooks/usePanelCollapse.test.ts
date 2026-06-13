import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelCollapse } from './usePanelCollapse';

describe('usePanelCollapse', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to expanded on desktop', () => {
    const { result } = renderHook(() => usePanelCollapse(false));
    expect(result.current.isExpanded).toBe(true);
  });

  it('persists collapsed state', () => {
    const { result } = renderHook(() => usePanelCollapse(false));
    act(() => {
      result.current.setCollapsed(true);
    });
    expect(localStorage.getItem('whatsupnyc_panel_collapsed')).toBe('1');
    expect(result.current.isExpanded).toBe(false);
  });

  it('forces expanded on mobile', () => {
    const { result, rerender } = renderHook(({ mobile }) => usePanelCollapse(mobile), {
      initialProps: { mobile: false },
    });
    act(() => {
      result.current.setCollapsed(true);
    });
    rerender({ mobile: true });
    expect(result.current.isExpanded).toBe(true);
  });
});
