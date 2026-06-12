import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Settings, List, Map, X } from 'lucide-react';

/** z-index: FAB 999, below settings dialog 1200 and event modal 2000 */

interface MapFabMenuProps {
  isMobile: boolean;
  visible: boolean;
  eventCount: number;
  listOnlyMode: boolean;
  onBrowseEvents: () => void;
  onToggleSettings: () => void;
  onToggleListOnly: () => void;
}

const MapFabMenu: React.FC<MapFabMenuProps> = ({
  isMobile,
  visible,
  eventCount,
  listOnlyMode,
  onBrowseEvents,
  onToggleSettings,
  onToggleListOnly,
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

  if (!isMobile || !visible) return null;

  const menuItems = [
    {
      id: 'browse',
      label: `Browse events · ${eventCount}`,
      icon: Calendar,
      onClick: () => {
        onBrowseEvents();
        setOpen(false);
      },
    },
    {
      id: 'settings',
      label: 'Map settings',
      icon: Settings,
      onClick: () => {
        onToggleSettings();
        setOpen(false);
      },
    },
    {
      id: 'list',
      label: listOnlyMode ? 'Show map' : 'List-only mode',
      icon: listOnlyMode ? Map : List,
      onClick: () => {
        onToggleListOnly();
        setOpen(false);
      },
    },
  ];

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[999] flex flex-col items-end gap-2"
      data-testid="map-fab-menu"
    >
      {open && (
        <div
          role="menu"
          className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl py-1 min-w-[200px] mb-1"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={item.onClick}
              className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-muted flex items-center gap-2"
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open map menu'}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground border border-white/20 flex items-center justify-center shadow-xl"
      >
        {open ? (
          <X className="w-6 h-6" aria-hidden />
        ) : listOnlyMode ? (
          <Map className="w-6 h-6" aria-hidden />
        ) : (
          <Calendar className="w-6 h-6" aria-hidden />
        )}
      </button>
    </div>
  );
};

export default React.memo(MapFabMenu);
