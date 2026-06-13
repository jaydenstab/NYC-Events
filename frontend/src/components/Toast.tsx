import React from 'react';
import { createPortal } from 'react-dom';
import type { ToastItem } from '@/hooks/useToast';

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  isMobile?: boolean;
}

const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, isMobile = false }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-[4000] flex flex-col gap-2 pointer-events-none ${
        isMobile ? 'bottom-24 left-4 right-4 items-center' : 'bottom-6 left-6 items-start'
      }`}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-foreground border border-border shadow-xl text-sm font-medium max-w-sm animate-fadeIn"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className="text-primary underline font-bold shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100 shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default React.memo(Toast);
