import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Copy, MapPin, Calendar, Download, CalendarX } from 'lucide-react';
import type { Event } from '@/types/Event';
import { buildGoogleCalendarUrl, canAddToCalendar, downloadIcs } from '@/lib/calendar';
import { copyToClipboard, buildEventShareUrl } from '@/lib/share';

interface EventActionMenuProps {
  event: Event;
  linkCopied: boolean;
  addressCopied: boolean;
  onLinkCopied: (v: boolean) => void;
  onAddressCopied: (v: boolean) => void;
}

const EventActionMenu: React.FC<EventActionMenuProps> = ({
  event,
  linkCopied,
  addressCopied,
  onLinkCopied,
  onAddressCopied,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarReady = canAddToCalendar(event);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;

    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'button, [href], [role="menuitem"]'
    );
    focusable[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || focusable.length === 0) return;

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
  }, [open]);

  const copyLink = async () => {
    const ok = await copyToClipboard(buildEventShareUrl(event.id));
    onLinkCopied(ok);
    if (ok) window.setTimeout(() => onLinkCopied(false), 2000);
    setOpen(false);
  };

  const copyAddress = async () => {
    const ok = await copyToClipboard(event.address);
    onAddressCopied(ok);
    if (ok) window.setTimeout(() => onAddressCopied(false), 2000);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="px-3 py-2 bg-muted text-foreground border border-border rounded-xl text-sm font-semibold flex items-center gap-2"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden />
        More
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-20 min-w-[200px] bg-card border border-border rounded-xl shadow-lg py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
          >
            <Copy className="w-4 h-4 shrink-0" aria-hidden />
            {linkCopied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={copyAddress}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            {addressCopied ? 'Copied!' : 'Copy address'}
          </button>
          {calendarReady ? (
            <>
              <a
                href={buildGoogleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 no-underline text-foreground"
                onClick={() => setOpen(false)}
              >
                <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                Google Calendar
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadIcs(event);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden />
                Download .ics
              </button>
            </>
          ) : (
            <div
              className="px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2 opacity-60"
              title="Add a date to enable calendar export"
            >
              <CalendarX className="w-4 h-4 shrink-0" aria-hidden />
              Calendar unavailable
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(EventActionMenu);
