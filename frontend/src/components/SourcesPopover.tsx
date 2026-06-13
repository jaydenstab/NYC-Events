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
  shownCount?: number;
  catalogTotal?: number;
  mapEventCount?: number;
  listOnlyMode?: boolean;
  dataSource?: 'live' | 'demo';
}

const SourcesPopover: React.FC<SourcesPopoverProps> = ({
  updatedLabel,
  degradedSources = [],
  shownCount,
  catalogTotal,
  mapEventCount,
  listOnlyMode = false,
  dataSource = 'live',
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

  const showCatalogNote =
    dataSource === 'live' &&
    catalogTotal != null &&
    shownCount != null &&
    catalogTotal > shownCount;
  const showMapNote =
    !listOnlyMode &&
    mapEventCount != null &&
    shownCount != null &&
    mapEventCount !== shownCount;

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
          className="absolute left-0 top-full mt-1 z-30 w-56 bg-surface-elevated border border-border rounded-xl shadow-lg p-3 text-xs"
        >
          <p className="font-semibold text-foreground mb-2">What&apos;s included</p>
          <ul className="space-y-1 text-muted-foreground mb-2">
            {EVENT_SOURCES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {(showCatalogNote || showMapNote) && (
            <div className="text-muted-foreground space-y-1 mb-2 pt-2 border-t border-border">
              {showCatalogNote && (
                <p>
                  {catalogTotal} upcoming in catalog ({shownCount} shown)
                </p>
              )}
              {showMapNote && <p>{mapEventCount} events on map</p>}
            </div>
          )}
          {degradedSources.length > 0 && (
            <p className="text-status-warning text-xs">
              Updating: {degradedSources.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SourcesPopover);
