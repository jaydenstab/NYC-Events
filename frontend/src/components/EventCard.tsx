import React, { useRef, useState } from 'react';
import { Event, categoryConfig } from '@/types/Event';
import { formatDateTimeLine, formatRelativeDate } from '@/lib/dateFormat';
import { distanceMiles, formatDistanceMiles, type UserLocation } from '@/lib/geo';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { openDirections } from '@/lib/navigation';
import { parseBorough } from '@/lib/borough';
import { isFreePrice } from '@/lib/price';
import { isPreciseLocation } from '@/lib/locationQuality';
import { prefersReducedMotion } from '@/lib/motion';
import { Heart, MapPin, Navigation, Map } from 'lucide-react';

interface EventCardProps {
  event: Event;
  isSaved: boolean;
  isHighlighted?: boolean;
  onToggleSave: (eventId: string) => void;
  onClick: (event: Event) => void;
  onShowOnMap?: (event: Event) => void;
  userLocation?: UserLocation | null;
  isMobile?: boolean;
  hideApproxBadge?: boolean;
  onSwipeSave?: (eventId: string) => void;
}

const SWIPE_THRESHOLD = 60;

const EventCard: React.FC<EventCardProps> = ({
  event,
  isSaved,
  isHighlighted = false,
  onToggleSave,
  onClick,
  onShowOnMap,
  userLocation,
  isMobile = false,
  hideApproxBadge = false,
  onSwipeSave,
}) => {
  const config = categoryConfig[event.category] || categoryConfig.other;
  const Icon = getCategoryIcon(event.category);
  const borough = event.borough || parseBorough(event.address);
  const isTonight = formatRelativeDate(event.date) === 'Tonight';
  const isFree = isFreePrice(event.price);
  const approx = event.locationQuality && !isPreciseLocation(event.locationQuality);
  const showApprox = approx && !hideApproxBadge;
  const [imageError, setImageError] = useState(false);
  const swipeEnabled = isMobile && onSwipeSave && !prefersReducedMotion();

  const touchStartX = useRef<number | null>(null);

  const distanceLabel =
    userLocation != null
      ? formatDistanceMiles(
          distanceMiles(userLocation.lat, userLocation.lng, event.lat, event.lng)
        )
      : null;

  const handleContentClick = () => onClick(event);

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(event);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeEnabled || isSaved) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeEnabled || isSaved || touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta >= SWIPE_THRESHOLD) {
      onSwipeSave!(event.id);
    }
  };

  const imageSrc = !imageError && event.imageUrl ? event.imageUrl : null;

  return (
    <article
      data-event-id={event.id}
      aria-current={isHighlighted ? 'true' : undefined}
      className={`event-card group relative bg-surface-elevated/80 hover:bg-surface-elevated rounded-card p-4 mb-3 border-l-4 transition-all shadow-sm hover:shadow-md ${
        isHighlighted ? 'event-card-highlighted ring-2 ring-primary/40 bg-surface-elevated' : 'border-transparent hover:border-primary/20'
      }`}
      style={{ borderLeftColor: config.color }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex gap-3 items-start">
        <div
          role="button"
          tabIndex={0}
          aria-label={`View ${event.name}`}
          className="flex gap-3 flex-1 min-w-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
          onClick={handleContentClick}
          onKeyDown={handleContentKeyDown}
        >
          <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden relative">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${config.color}44, ${config.color}22)`,
                  color: config.color,
                }}
              >
                <Icon className="w-6 h-6" aria-hidden />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-body font-bold text-foreground leading-tight line-clamp-2 mb-1 pr-6">
              {event.name}
            </h3>

            <p className="text-xs font-semibold text-muted-foreground mb-2">
              <span className={isTonight ? 'text-primary font-bold' : ''}>
                {formatDateTimeLine(event.date, event.time)}
              </span>
              {distanceLabel && <span className="text-primary"> · {distanceLabel}</span>}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: config.color }}
              >
                {event.category}
              </span>
              {borough && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                  {borough}
                </span>
              )}
              {isFree && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success/10 text-status-success">
                  Free
                </span>
              )}
            </div>

            <p className="text-body-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
              <MapPin
                className={`w-3 h-3 shrink-0 ${showApprox ? 'opacity-60' : ''}`}
                aria-hidden
                strokeDasharray={showApprox ? '2 2' : undefined}
              />
              {event.address}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isSaved ? `Unsave ${event.name}` : `Save ${event.name}`}
          onClick={() => onToggleSave(event.id)}
          className="absolute top-4 right-4 p-1 transition-transform active:scale-110 text-muted-foreground hover:text-red-500"
        >
          <Heart
            className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2 pl-[4.25rem] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label={`Directions to ${event.name}`}
          onClick={() => openDirections(event.address)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Navigation className="w-3 h-3" aria-hidden />
          Directions
        </button>
        {onShowOnMap && (
          <button
            type="button"
            aria-label={`Show ${event.name} on map`}
            onClick={() => onShowOnMap(event)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            <Map className="w-3 h-3" aria-hidden />
            Map
          </button>
        )}
      </div>
    </article>
  );
};

export default React.memo(EventCard);
