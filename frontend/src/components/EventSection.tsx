import React from 'react';
import type { Event } from '@/types/Event';
import EventCardV2 from './EventCardV2';
import type { EventSection as EventSectionData } from '@/lib/eventSections';

interface EventSectionProps {
  section: EventSectionData;
  onViewAll?: (when: 'today' | 'weekend') => void;
  onViewAllComingUp?: () => void;
  onBrowseWeekend?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isEventSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onEventClick: (event: Event) => void;
  onShowOnMap?: (event: Event) => void;
  highlightedEventId?: string | null;
  userLocation?: import('@/lib/geo').UserLocation | null;
  isMobile?: boolean;
  onSwipeSave?: (id: string) => void;
  hideApproxBadge?: boolean;
}

const EventSection: React.FC<EventSectionProps> = ({
  section,
  onViewAll,
  onViewAllComingUp,
  onBrowseWeekend,
  onLoadMore,
  hasMore = false,
  isEventSaved,
  onToggleSave,
  onEventClick,
  onShowOnMap,
  highlightedEventId,
  userLocation,
  isMobile,
  onSwipeSave,
  hideApproxBadge,
}) => {
  const showViewAll =
    (section.viewAllWhen && onViewAll && (section.totalCount ?? section.events.length) > section.events.length) ||
    (section.viewAllComingUp && onViewAllComingUp && (section.totalCount ?? 0) > section.events.length);

  if (section.events.length === 0 && section.id === 'tonight') {
    return (
      <section id={`event-section-${section.id}`} className="pb-2" aria-label={section.title}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-foreground">{section.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground py-1 mb-2">
          No events tonight.
        </p>
        <div className="flex flex-wrap gap-2">
          {onBrowseWeekend && (
            <button
              type="button"
              onClick={onBrowseWeekend}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Browse this weekend
            </button>
          )}
          {hasMore && onLoadMore && (
            <button
              type="button"
              onClick={onLoadMore}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Load more events
            </button>
          )}
        </div>
      </section>
    );
  }

  if (section.events.length === 0) return null;

  return (
    <section id={`event-section-${section.id}`} className="pb-3" aria-label={section.title}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-foreground">{section.title}</h2>
        {showViewAll && section.viewAllWhen && onViewAll && (
          <button
            type="button"
            onClick={() => onViewAll(section.viewAllWhen!)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </button>
        )}
        {showViewAll && section.viewAllComingUp && onViewAllComingUp && (
          <button
            type="button"
            onClick={onViewAllComingUp}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {section.events.map((event) => (
          <EventCardV2
            key={event.id}
            event={event}
            isSaved={isEventSaved(event.id)}
            isHighlighted={highlightedEventId === event.id}
            onToggleSave={onToggleSave}
            onClick={onEventClick}
            onShowOnMap={onShowOnMap}
            userLocation={userLocation}
            isMobile={isMobile}
            onSwipeSave={onSwipeSave}
            hideApproxBadge={hideApproxBadge}
          />
        ))}
      </div>
    </section>
  );
};

export default React.memo(EventSection);
