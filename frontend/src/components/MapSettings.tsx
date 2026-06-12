import React, { useEffect, useRef } from 'react';
import { Settings, Map } from 'lucide-react';
import type { MapAppearance } from '@/hooks/useMapPreferences';

interface MapSettingsProps {
  isOpen: boolean;
  onToggle: () => void;
  hideToggle?: boolean;
  demoBannerVisible?: boolean;
  appearance: MapAppearance;
  onAppearanceChange: (appearance: MapAppearance) => void;
  is3D: boolean;
  onIs3DChange: (v: boolean) => void;
  listOnlyMode: boolean;
}

const APPEARANCE_OPTIONS: { value: MapAppearance; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'satellite', label: 'Satellite' },
];

const MapSettings: React.FC<MapSettingsProps> = ({
  isOpen,
  onToggle,
  hideToggle = false,
  demoBannerVisible = false,
  appearance,
  onAppearanceChange,
  is3D,
  onIs3DChange,
  listOnlyMode,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        onToggle();
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (!isOpen) return;

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggle();
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onToggle]);

  const positionClass = demoBannerVisible ? 'top-14 md:top-16' : 'top-4';

  const rootClass = hideToggle
    ? isOpen
      ? 'fixed bottom-24 right-4 z-[1200]'
      : 'hidden'
    : `absolute ${positionClass} right-4 z-[1200]`;

  return (
    <div ref={rootRef} data-map-settings className={rootClass}>
      {!hideToggle && (
        <button
          ref={toggleRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label="Map settings"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground border border-white/20 flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
        >
          <Settings className="w-5 h-5 md:w-6 md:h-6" aria-hidden />
        </button>
      )}

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-settings-title"
          className={`${
            hideToggle ? 'relative' : 'absolute top-14 md:top-16 right-0'
          } w-64 md:w-72 bg-card/95 backdrop-blur rounded-2xl p-4 md:p-6 shadow-2xl z-[1201] border border-border`}
        >
          <h3 id="map-settings-title" className="text-lg font-bold mb-4 text-foreground">
            Map Settings
          </h3>

          <fieldset className="border-0 p-0 m-0 mb-4" disabled={listOnlyMode}>
            <legend className="block text-sm font-medium text-muted-foreground mb-1.5">
              Appearance
            </legend>
            <div className={`flex flex-wrap gap-1.5 ${listOnlyMode ? 'opacity-50' : ''}`}>
              {APPEARANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={appearance === opt.value}
                  disabled={listOnlyMode}
                  onClick={() => onAppearanceChange(opt.value)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border disabled:cursor-not-allowed ${
                    appearance === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {listOnlyMode && (
              <p className="text-xs text-muted-foreground mt-2">
                Map appearance applies when map view is visible.
              </p>
            )}
          </fieldset>

          <label
            className={`flex items-center gap-2 text-sm cursor-pointer ${listOnlyMode ? 'opacity-50' : ''}`}
          >
            <input
              type="checkbox"
              checked={is3D}
              onChange={(e) => onIs3DChange(e.target.checked)}
              disabled={listOnlyMode}
            />
            <Map className="w-4 h-4" aria-hidden />
            <span>3D buildings</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default React.memo(MapSettings);
