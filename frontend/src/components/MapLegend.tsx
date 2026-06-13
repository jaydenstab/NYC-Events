import React from 'react';
import { MapPin } from 'lucide-react';

interface MapLegendProps {
  hidden?: boolean;
  eventCount?: number;
}

const shellClass =
  'rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-xl shadow-sm';

const MapLegend: React.FC<MapLegendProps> = ({ hidden = false, eventCount = 0 }) => {
  if (hidden || eventCount === 0) return null;

  return (
    <div
      className={`absolute bottom-6 right-4 z-[500] flex items-center gap-2 px-3 py-2 ${shellClass} text-foreground text-[11px] font-medium pointer-events-none`}
      aria-hidden
    >
      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
      <span>
        {eventCount} {eventCount === 1 ? 'event' : 'events'} on map
      </span>
    </div>
  );
};

export default React.memo(MapLegend);
