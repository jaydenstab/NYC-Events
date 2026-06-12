import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  visible: boolean;
  onRetry?: () => void;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible, onRetry }) => {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[2990] flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-800 text-slate-100 text-sm font-medium shadow-lg"
    >
      <span className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
        You&apos;re offline — showing cached events.
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default React.memo(OfflineBanner);
