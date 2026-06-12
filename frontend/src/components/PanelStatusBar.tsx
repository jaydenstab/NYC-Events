import React from 'react';
import { X } from 'lucide-react';

export type PanelStatusType = 'ingesting' | 'semantic' | 'approximate' | 'map' | null;

interface PanelStatusBarProps {
  status: PanelStatusType;
  message: string;
  onDismiss?: () => void;
}

const STATUS_STYLES: Record<Exclude<PanelStatusType, null>, string> = {
  ingesting: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200',
  semantic: 'bg-primary/5 text-primary',
  approximate: 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200',
  map: 'bg-muted text-muted-foreground',
};

const PanelStatusBar: React.FC<PanelStatusBarProps> = ({ status, message, onDismiss }) => {
  if (!status || !message) return null;

  const dismissible = status === 'approximate' || status === 'map';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-5 mb-2 p-3 rounded-xl text-xs flex items-start justify-between gap-2 ${STATUS_STYLES[status]}`}
    >
      <span>{message}</span>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 p-0.5 rounded hover:bg-black/5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default React.memo(PanelStatusBar);
