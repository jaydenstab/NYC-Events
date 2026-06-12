import { useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = {
        id,
        message,
        actionLabel: opts?.actionLabel,
        onAction: opts?.onAction,
      };
      setToasts((prev) => [...prev, item]);
      const duration = opts?.durationMs ?? 4000;
      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return { toasts, show, dismiss };
}
