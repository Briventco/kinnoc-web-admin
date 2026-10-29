import { ImageIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { AdminEvent } from '../../types/event';
import { formatDateTime } from '../../utils/dates';
import { categoryLabel, eventLocation } from '../../utils/format';
import { EventStatusBadges } from './EventStatusBadges';

export function EventThumbnail({ event, size = 'md' }: { event: AdminEvent; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-20' : 'h-10 w-14';
  return event.coverImageUrl ? (
    <img src={event.coverImageUrl} alt="" loading="lazy" className={`${box} shrink-0 rounded object-cover`} />
  ) : (
    <div className={`${box} flex shrink-0 items-center justify-center rounded bg-slate-100`}>
      <ImageIcon className="size-4 text-slate-400" aria-hidden />
    </div>
  );
}

/** Events as a table on wide screens and stacked rows on phones. */
export function EventTable({ events }: { events: AdminEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="hidden bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase md:table-header-group">
          <tr>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Starts</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {events.map((event) => (
            <tr key={event.id} className="flex flex-col gap-2 p-4 hover:bg-slate-50 md:table-row md:p-0">
              <td className="md:px-4 md:py-3">
                <div className="flex items-center gap-3">
                  <EventThumbnail event={event} />
                  <div className="min-w-0">
                    <Link
                      to={`/events/${event.id}`}
                      className="font-medium break-words text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {categoryLabel(event.category)} · {event.organizerName}
                    </p>
                  </div>
                </div>
              </td>
              <td className="text-slate-600 md:px-4 md:py-3">{formatDateTime(event.startAt, event.timezone)}</td>
              <td className="text-slate-600 md:px-4 md:py-3">{eventLocation(event)}</td>
              <td className="md:px-4 md:py-3">
                <EventStatusBadges event={event} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
