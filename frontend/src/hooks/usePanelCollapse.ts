import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'whatsupnyc_panel_collapsed';

function loadCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    return false;
  } catch {
    return false;
  }
}

export function usePanelCollapse(isMobile: boolean) {
  const [collapsed, setCollapsedState] = useState(() => (isMobile ? false : loadCollapsed()));

  useEffect(() => {
    if (isMobile) {
      setCollapsedState(false);
      return;
    }
    setCollapsedState(loadCollapsed());
  }, [isMobile]);

  const setCollapsed = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setCollapsedState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (!isMobile) {
          try {
            localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
          } catch {
            /* ignore */
          }
        }
        return isMobile ? false : next;
      });
    },
    [isMobile]
  );

  const isExpanded = !collapsed;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => !v);
  }, [setCollapsed]);

  return {
    collapsed,
    isExpanded,
    setCollapsed,
    toggleCollapsed,
  };
}
