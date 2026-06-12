import { useRef, useCallback, useState } from 'react';

interface UsePullToRefreshOptions {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({
  enabled,
  onRefresh,
  threshold = 72,
}: UsePullToRefreshOptions) {
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing) return;
      const el = e.currentTarget as HTMLElement;
      if (el.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    },
    [enabled, isRefreshing]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !pullingRef.current || isRefreshing) return;
      const delta = e.changedTouches[0].clientY - startYRef.current;
      pullingRef.current = false;
      if (delta >= threshold) {
        setIsRefreshing(true);
        Promise.resolve(onRefresh()).finally(() => {
          setIsRefreshing(false);
        });
      }
    },
    [enabled, isRefreshing, onRefresh, threshold]
  );

  return { onTouchStart, onTouchEnd, isRefreshing };
}
