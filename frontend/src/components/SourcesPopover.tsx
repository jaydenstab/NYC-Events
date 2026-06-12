import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

const EVENT_SOURCES = [
  'The Skint',
  'Oh My Rockness',
  'Eventbrite',
  'NYC Parks',
  'NYC Go',
  'Reddit',
];

interface SourcesPopoverProps {
  updatedLabel: string | null;
  degradedSources?: string[];
}

const SourcesPopover: React.FC<SourcesPopoverProps> = ({
  updatedLabel,
  degradedSources = [],
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!updatedLabel) return null;

  return (
    <div className="relative inline" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline inline-flex items-center gap-0.5"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Updated {updatedLabel}
        <Info className="w-3 h-3" aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Event sources"
          className="absolute left-0 top-full mt-1 z-30 w-56 bg-card border border-border rounded-xl shadow-lg p-3 text-xs"
        >
          <p className="font-semibold text-foreground mb-2">What&apos;s included</p>
          <ul className="space-y-1 text-muted-foreground mb-2">
            {EVENT_SOURCES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {degradedSources.length > 0 && (
            <p className="text-amber-700 dark:text-amber-300">
              Updating: {degradedSources.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SourcesPopover);
