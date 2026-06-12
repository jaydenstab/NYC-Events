import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh';

function makeTouchEvent(
  type: 'touchstart' | 'touchend',
  clientY: number,
  scrollTop = 0
) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true });

  const touches = type === 'touchstart' ? [{ clientY }] : [];
  const changedTouches = type === 'touchend' ? [{ clientY }] : [];

  return {
    currentTarget: el,
    touches,
    changedTouches,
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent;
}

describe('usePullToRefresh', () => {
  it('sets isRefreshing true while onRefresh promise is pending', async () => {
    let resolveRefresh: () => void = () => {};
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, onRefresh, threshold: 50 })
    );

    expect(result.current.isRefreshing).toBe(false);

    act(() => {
      result.current.onTouchStart(makeTouchEvent('touchstart', 100));
    });
    act(() => {
      result.current.onTouchEnd(makeTouchEvent('touchend', 160));
    });

    expect(result.current.isRefreshing).toBe(true);
    expect(onRefresh).toHaveBeenCalled();

    await act(async () => {
      resolveRefresh();
      await Promise.resolve();
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('does not refresh when pull distance is below threshold', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, onRefresh, threshold: 72 })
    );

    act(() => {
      result.current.onTouchStart(makeTouchEvent('touchstart', 100));
      result.current.onTouchEnd(makeTouchEvent('touchend', 150));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false);
  });
});
