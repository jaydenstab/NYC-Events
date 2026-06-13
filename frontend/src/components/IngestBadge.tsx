import React from 'react';

interface IngestBadgeProps {
  active: boolean;
  degradedSources?: string[];
}

const IngestBadge: React.FC<IngestBadgeProps> = ({ active, degradedSources = [] }) => {
  const isDev = import.meta.env.DEV;

  if (degradedSources.length > 0) {
    const title = `Data from ${degradedSources.join(', ')} may be incomplete — we're refreshing in the background.`;
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-[10px] border border-primary/30"
        title={title}
      >
        <span className="text-[9px] font-bold text-primary uppercase tracking-wide">
          Updating
        </span>
      </div>
    );
  }

  if (!active || !isDev) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1 bg-status-success/10 px-2 py-0.5 rounded-[10px] border border-status-success/30"
    >
      <div className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse" aria-hidden />
      <span className="text-[9px] font-bold text-status-success uppercase tracking-wide">
        Live
      </span>
    </div>
  );
};

export default React.memo(IngestBadge);
