/**
 * The API stores instants and a separate IANA time zone. The form edits the
 * event's local wall-clock time ("2026-11-21T09:00" in Africa/Lagos) and sends
 * it with that zone's offset ("2026-11-21T09:00:00+01:00"), as docs/events.md §5 asks.
 */

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

export function timeZoneOptions(): string[] {
  let zones: string[];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = [DEFAULT_TIMEZONE];
  }
  return zones.includes('UTC') ? zones : ['UTC', ...zones];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes east of UTC for `timeZone` at the instant `ms`. */
function offsetMinutes(timeZone: string, ms: number): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date(ms))
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "2026-11-21T09:00" in `timeZone` → "2026-11-21T09:00:00+01:00". Null if invalid. */
export function zonedLocalToIso(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match || !isValidTimeZone(timeZone)) return null;
  const [, y, mo, d, h, mi] = match;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  // Two passes settle the offset correctly around daylight-saving changes.
  let offset = offsetMinutes(timeZone, wall);
  offset = offsetMinutes(timeZone, wall - offset * 60_000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${y}-${mo}-${d}T${h}:${mi}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** An ISO instant → "YYYY-MM-DDTHH:mm" in `timeZone`, for <input type="datetime-local">. */
export function isoToZonedLocal(iso: string | null, timeZone: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "Sat, 21 Nov 2026, 09:00 WAT" — shown in the event's own zone. */
export function formatDateTime(iso: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : undefined,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

/** A local calendar date ("2026-11-21") → that midnight in the browser's zone, as ISO. */
export function localDateToIso(date: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const value = new Date(`${date}T00:00`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}
