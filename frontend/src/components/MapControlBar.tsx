import React, { useEffect, useState } from 'react';
import { Layers, Minus, Plus, Maximize2, Minimize2, Compass } from 'lucide-react';
import type { NYC3DMapHandle } from './NYC3DMap';

interface MapControlBarProps {
  mapRef: React.RefObject<NYC3DMapHandle | null>;
  is3D: boolean;
  onIs3DChange: (v: boolean) => void;
  hidden?: boolean;
}

const shellClass =
  'rounded-xl border border-border bg-surface-elevated/95 backdrop-blur-xl overflow-hidden shadow-sm';
const btnBase =
  'w-9 h-9 flex items-center justify-center transition-colors text-muted-foreground hover:bg-muted hover:text-foreground';
const btnActive = 'bg-primary/15 text-primary border-l-2 border-primary rounded-l-none';
const btnDivider = 'border-t border-border';

const MapControlBar: React.FC<MapControlBarProps> = ({
  mapRef,
  is3D,
  onIs3DChange,
  hidden = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  if (hidden) return null;

  return (
    <div className="absolute top-4 right-4 z-[500]" aria-label="Map controls">
      <div className={`${shellClass} flex flex-col`}>
        <button
          type="button"
          className={`${btnBase} ${is3D ? btnActive : ''}`}
          aria-pressed={is3D}
          title={is3D ? '2D map' : '3D map'}
          aria-label={is3D ? 'Switch to 2D map' : 'Switch to 3D map with buildings and terrain'}
          onClick={() => onIs3DChange(!is3D)}
        >
          <Layers className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnDivider}`}
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <Plus className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnDivider}`}
          aria-label="Zoom out"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <Minus className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnDivider}`}
          aria-label="Reset north"
          onClick={() => mapRef.current?.resetNorth()}
        >
          <Compass className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnDivider}`}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen?.();
          }}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" aria-hidden />
          ) : (
            <Maximize2 className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
};

export default React.memo(MapControlBar);
