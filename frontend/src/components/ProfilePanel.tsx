import React from 'react';
import type { AppTheme, MapAppearance } from '@/hooks/useAppPreferences';

interface ProfilePanelProps {
  appTheme: AppTheme;
  onAppThemeChange: (theme: AppTheme) => void;
  mapAppearance: MapAppearance;
  onMapAppearanceChange: (appearance: MapAppearance) => void;
  is3D: boolean;
  onIs3DChange: (v: boolean) => void;
  onOpenShortcuts?: () => void;
}

const APP_THEME_OPTIONS: { value: AppTheme; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Clean light sidebar and panels' },
  { value: 'dark', label: 'Dark', hint: 'Orange accent on dark surfaces' },
  { value: 'system', label: 'System', hint: 'Follow device appearance' },
];

const MAP_APPEARANCE_OPTIONS: { value: MapAppearance; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'satellite', label: 'Satellite' },
];

const ProfilePanel: React.FC<ProfilePanelProps> = ({
  appTheme,
  onAppThemeChange,
  mapAppearance,
  onMapAppearanceChange,
  is3D,
  onIs3DChange,
  onOpenShortcuts,
}) => {
  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-surface-elevated text-foreground hover:border-primary/40'
    }`;

  return (
    <div className="px-5 py-4 space-y-6 overflow-y-auto flex-1">
      <div>
        <h2 className="text-sm font-bold text-foreground mb-1">Profile</h2>
        <p className="text-xs text-muted-foreground">
          Account sync coming soon. Adjust app and map preferences below.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          App appearance
        </p>
        <div className="flex flex-wrap gap-2">
          {APP_THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAppThemeChange(opt.value)}
              className={chipClass(appTheme === opt.value)}
              title={opt.hint}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Map style
        </p>
        <div className="flex flex-wrap gap-2">
          {MAP_APPEARANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onMapAppearanceChange(opt.value)}
              className={chipClass(mapAppearance === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          App and map themes are independent.
        </p>
      </div>

      <div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm font-medium text-foreground">3D map (buildings &amp; terrain)</span>
          <input
            type="checkbox"
            checked={is3D}
            onChange={(e) => onIs3DChange(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </label>
      </div>

      {onOpenShortcuts && (
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Keyboard shortcuts
        </button>
      )}

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">
          Event times use your browser&apos;s local timezone.
        </p>
        <a
          href="https://github.com/jaydenstab/NYC-Events"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary hover:underline"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
};

export default React.memo(ProfilePanel);
