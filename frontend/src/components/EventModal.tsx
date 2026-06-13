import React, { useState, useEffect, useRef } from 'react';
import { Event, categoryConfig } from '@/types/Event';
import { outboundLinkLabel } from '@/lib/eventLink';
import { isPreciseLocation } from '@/lib/locationQuality';
import { openDirections, openInMaps } from '@/lib/navigation';
import { formatModalDate } from '@/lib/dateFormat';
import CategoryImagePlaceholder from './CategoryImagePlaceholder';
import { shareEvent } from '@/lib/share';
import { humanizeSource, getSourceUrl } from '@/lib/source';
import EventActionMenu from './EventActionMenu';
import {
  X,
  Heart,
  Calendar,
  Share2,
  MapPin,
  Navigation,
  Info,
} from 'lucide-react';

interface EventModalProps {
  event: Event | null;
  eventNotFound?: boolean;
  onClose: () => void;
  onClearEventLink?: () => void;
  isMobile: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  event,
  eventNotFound = false,
  onClose,
  onClearEventLink,
  isMobile,
  isSaved,
  onToggleSave,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHeroImageError(false);
  }, [event?.id]);

  useEffect(() => {
    if (!event && !eventNotFound) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
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
  }, [event, eventNotFound, onClose]);

  if (!event && !eventNotFound) return null;

  if (eventNotFound) {
    return (
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-not-found-title"
          className="bg-surface-elevated rounded-3xl p-8 max-w-sm text-center shadow-2xl border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="event-not-found-title" className="text-xl font-bold mb-2">
            Event not found
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            This event may have ended or the link is invalid.
          </p>
          <div className="flex gap-2">
            {onClearEventLink && (
              <button
                type="button"
                onClick={onClearEventLink}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold"
              >
                Clear link
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const config = categoryConfig[event.category] || categoryConfig.other;
  const showNeighborhoodBadge = event.locationQuality && !isPreciseLocation(event.locationQuality);
  const sourceUrl = event.source ? getSourceUrl(event.source) : null;

  const handleShare = async () => {
    const result = await shareEvent(event);
    if (result.method === 'clipboard') setShareStatus('Link copied!');
    else if (result.method === 'native') setShareStatus('Shared!');
    else setShareStatus('Share failed');
    window.setTimeout(() => setShareStatus(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-5 animate-fadeIn"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        aria-describedby="event-modal-description"
        className={`relative w-full max-h-[90vh] overflow-auto text-foreground bg-surface backdrop-blur-xl shadow-2xl border border-border ${
          isMobile
            ? 'rounded-t-[32px] px-5 pt-8 pb-28 max-w-full animate-slideUpMobile self-end'
            : 'rounded-[32px] p-10 max-w-[520px] max-h-[85vh] animate-slideUp'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className={`absolute top-5 right-5 rounded-full bg-muted border-none cursor-pointer flex items-center justify-center text-muted-foreground z-10 ${
            isMobile ? 'w-8 h-8' : 'w-10 h-10'
          }`}
        >
          <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
        </button>

        {!isMobile && (
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={isSaved ? 'Unsave event' : 'Save event'}
            className="absolute top-5 left-5 rounded-full bg-muted border-none cursor-pointer flex items-center justify-center z-10 w-10 h-10"
          >
            <Heart
              className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </button>
        )}

        {event.imageUrl && !heroImageError ? (
          <div
            className={`mb-4 overflow-hidden rounded-card ${isMobile ? 'mt-2' : 'mt-0 -mx-0'}`}
          >
            <img
              src={event.imageUrl}
              alt=""
              className="w-full h-48 object-cover"
              onError={() => setHeroImageError(true)}
            />
          </div>
        ) : (
          <CategoryImagePlaceholder
            category={event.category}
            eventId={event.id}
            className={`mb-4 ${isMobile ? 'h-40 mt-2' : 'h-48'}`}
          />
        )}

        <div className={`mb-6 ${!isMobile ? 'pl-0' : ''}`}>
          <h2
            id="event-modal-title"
            className="font-bold mb-2 leading-tight text-body"
          >
            {event.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            <span
              className="text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
              style={{ background: config.color }}
            >
              {event.category}
            </span>
              {event.source &&
                (sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-[10px] font-bold no-underline hover:text-primary"
                  >
                    {humanizeSource(event.source)}
                  </a>
                ) : (
                  <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-[10px] font-bold">
                    {humanizeSource(event.source)}
                  </span>
                ))}
          </div>
        </div>

        <div className="mb-6 bg-surface-elevated p-5 rounded-2xl space-y-3 border border-border">
          <p className="flex items-center gap-3 font-semibold text-base">
            <Calendar className="w-5 h-5 text-primary shrink-0" aria-hidden />
            {formatModalDate(event.date)}
            {event.time && event.time !== 'TBD' && ` · ${event.time}`}
          </p>
          <p className="font-semibold text-base">{event.price}</p>
          <div className="flex items-start gap-3 font-semibold text-base">
            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div>
              {event.address}
              {showNeighborhoodBadge && (
                <p className="text-[11px] text-status-warning mt-1.5 bg-status-warning/10 px-2.5 py-1.5 rounded-lg font-medium flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                  Pin shows the neighborhood, not the exact venue address.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-base font-bold mb-2.5">About</h3>
          <p
            id="event-modal-description"
            className="text-muted-foreground leading-relaxed text-body-sm whitespace-pre-wrap"
          >
            {event.description}
          </p>
        </div>

        {event.website ? (
          <a
            href={event.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block w-full py-3.5 text-center text-white border-none rounded-xl font-bold no-underline hover:opacity-90 transition-opacity"
            style={{ backgroundColor: config.color }}
          >
            {outboundLinkLabel(event.linkKind)}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => openDirections(event.address)}
            className="mb-3 w-full py-3.5 bg-primary text-primary-foreground border-none rounded-xl font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" aria-hidden />
            Get directions
          </button>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <EventActionMenu
            event={event}
            linkCopied={linkCopied}
            addressCopied={addressCopied}
            onLinkCopied={setLinkCopied}
            onAddressCopied={setAddressCopied}
          />
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share event"
            className={`px-3 py-2 border border-border rounded-card text-body-sm font-semibold flex items-center gap-2 ${
              isMobile && typeof navigator !== 'undefined' && 'share' in navigator
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <Share2 className="w-4 h-4" aria-hidden />
            {shareStatus || 'Share'}
          </button>
        </div>

        {!isMobile && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => openInMaps(event.lat, event.lng, event.name)}
              aria-label={`Open ${event.name} in Maps`}
              className="flex-1 py-3.5 bg-primary text-primary-foreground border-none rounded-xl font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" aria-hidden />
              Open in Maps
            </button>
            <button
              type="button"
              onClick={() => openDirections(event.address)}
              aria-label={`Directions to ${event.name}`}
              className="flex-1 py-3.5 bg-muted text-foreground border-none rounded-xl font-bold cursor-pointer"
            >
              Directions
            </button>
          </div>
        )}

        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-[2001] flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface-elevated/95 backdrop-blur-xl border-t border-border">
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={isSaved ? 'Unsave event' : 'Save event'}
              className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => openInMaps(event.lat, event.lng, event.name)}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" aria-hidden />
              Maps
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 h-12 rounded-xl bg-foreground text-background font-bold flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" aria-hidden />
              {shareStatus || 'Share'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EventModal);
