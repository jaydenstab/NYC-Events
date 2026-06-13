import React, { useRef, useState } from 'react';
import { Event, categoryConfig } from '@/types/Event';
import { formatDateTimeLine } from '@/lib/dateFormat';
import { distanceMiles, formatDistanceMiles, type UserLocation } from '@/lib/geo';
import { parseBorough } from '@/lib/borough';
import { isPreciseLocation } from '@/lib/locationQuality';
import { prefersReducedMotion } from '@/lib/motion';
import CategoryImagePlaceholder from './CategoryImagePlaceholder';
import { Heart, MapPin } from 'lucide-react';

interface EventCardV2Props {
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

const EventCardV2: React.FC<EventCardV2Props> = ({
  event,
  isSaved,
  isHighlighted = false,
  onToggleSave,
  onClick,
  userLocation,
  isMobile = false,
  hideApproxBadge = false,
  onSwipeSave,
}) => {
  const config = categoryConfig[event.category] || categoryConfig.other;
  const borough = event.borough || parseBorough(event.address);
  const approx = event.locationQuality && !isPreciseLocation(event.locationQuality);
  const showApprox = approx && !hideApproxBadge;
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const swipeEnabled = isMobile && onSwipeSave && !prefersReducedMotion();

  const distanceLabel =
    userLocation != null
      ? formatDistanceMiles(
          distanceMiles(userLocation.lat, userLocation.lng, event.lat, event.lng)
        )
      : null;

  const imageSrc = !imageError && event.imageUrl ? event.imageUrl : null;
  const categoryLabel = (event.category || 'other').toUpperCase();
  const locationLine = borough ? `${event.address.split(',')[0]}, ${borough}` : event.address;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeEnabled || isSaved) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeEnabled || isSaved || touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta >= SWIPE_THRESHOLD) onSwipeSave!(event.id);
  };

  const reduceMotion = prefersReducedMotion();

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(event.id);
  };

  return (
    <article
      data-event-id={event.id}
      aria-current={isHighlighted ? 'true' : undefined}
      className={`group relative flex gap-3 p-3 rounded-xl bg-surface-elevated border border-border hover:border-primary/30 transition-colors ${
        isHighlighted ? 'event-card-highlighted ring-2 ring-primary/40' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        aria-label={isSaved ? `Unsave ${event.name}` : `Save ${event.name}`}
        aria-pressed={isSaved}
        onClick={handleHeartClick}
        className="absolute top-2 right-2 p-1 z-10 text-muted-foreground hover:text-red-500 transition-colors"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isSaved ? 'fill-red-500 text-red-500' : ''
          } ${!reduceMotion && isSaved ? 'scale-110' : ''} ${!reduceMotion ? 'transition-transform' : ''}`}
          aria-hidden
        />
      </button>

      <div
        role="button"
        tabIndex={0}
        aria-label={`View ${event.name}`}
        className="flex gap-3 flex-1 min-w-0 cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
        onClick={() => onClick(event)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(event);
          }
        }}
      >
        <div className="shrink-0 w-[88px] h-[72px]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover rounded-xl"
              onError={() => setImageError(true)}
            />
          ) : (
            <CategoryImagePlaceholder
              category={event.category}
              eventId={event.id}
              className="w-full h-full"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <p
            className="text-[10px] font-bold tracking-wider mb-0.5"
            style={{ color: config.color }}
          >
            {categoryLabel}
          </p>
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mb-1">
            {event.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-1">
            {formatDateTimeLine(event.date, event.time)}
            {distanceLabel && <span className="text-primary"> · {distanceLabel}</span>}
          </p>
          <p
            className={`text-[11px] text-muted-foreground line-clamp-1 flex items-center gap-1 ${
              showApprox ? 'opacity-70' : ''
            }`}
          >
            <MapPin className="w-3 h-3 shrink-0" aria-hidden />
            {locationLine}
          </p>
        </div>
      </div>
    </article>
  );
};

export default React.memo(EventCardV2);
