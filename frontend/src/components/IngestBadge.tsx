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
        className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-[10px] border border-orange-200 dark:border-orange-800"
        title={title}
      >
        <span className="text-[9px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
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
      className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[10px] border border-emerald-200 dark:border-emerald-800"
    >
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" aria-hidden />
      <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
        Live
      </span>
    </div>
  );
};

export default React.memo(IngestBadge);
