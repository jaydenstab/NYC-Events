import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'whatsupnyc_panel_width';
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 320;
const MAX_WIDTH = 480;

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return DEFAULT_WIDTH;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  } catch {
    return DEFAULT_WIDTH;
  }
}

export function usePanelWidth(enabled: boolean) {
  const [width, setWidth] = useState(loadWidth);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      /* ignore */
    }
  }, [width, enabled]);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
    setWidth(next);
  }, []);

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return { width, onResizePointerDown, onResizePointerMove, onResizePointerUp };
}
