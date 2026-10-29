/** Mirrors kinnoc-api src/events/dto (event.dto.ts and event.response.ts). */

export const EVENT_CATEGORIES = [
  'CONFERENCE',
  'TALK',
  'WORKSHOP',
  'MEETUP',
  'NETWORKING',
  'CONCERT',
  'FESTIVAL',
  'EXHIBITION',
  'SPORTS',
  'RELIGIOUS',
  'CAREER',
  'EDUCATION',
  'OTHER',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export interface EventPerson {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** `AdminEventResponse`. Dates are ISO strings (UTC instants). */
export interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverImageUrl: string | null;
  coverImageKey: string | null;
  organizerName: string;
  organizerLogoUrl: string | null;
  organizerLogoKey: string | null;
  category: EventCategory;
  tags: string[];
  startAt: string;
  endAt: string | null;
  timezone: string;
  isOnline: boolean;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  onlineEventUrl: string | null;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  capacity: number | null;
  priceAmount: number | null;
  currency: string | null;
  status: EventStatus;
  isPast: boolean;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  archivedAt: string | null;
  createdBy: EventPerson | null;
  updatedBy: EventPerson | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields accepted by `POST /admin/events` and `PATCH /admin/events/:id`. */
export interface EventWritableFields {
  title: string;
  slug: string;
  organizerName: string;
  category: EventCategory;
  startAt: string;
  timezone: string;
  isOnline: boolean;
  summary: string | null;
  description: string | null;
  coverImageKey: string | null;
  organizerLogoKey: string | null;
  tags: string[] | null;
  endAt: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  onlineEventUrl: string | null;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  capacity: number | null;
  priceAmount: number | null;
  currency: string | null;
}

/** Create: required fields plus any optional ones; `publish: true` publishes at once. */
export type CreateEventInput = Pick<
  EventWritableFields,
  'title' | 'organizerName' | 'category' | 'startAt' | 'timezone'
> &
  Partial<Omit<EventWritableFields, 'title' | 'organizerName' | 'category' | 'startAt' | 'timezone'>> & {
    publish?: boolean;
  };

/** Update: only the fields sent change; `null` clears an optional field. */
export type UpdateEventInput = Partial<EventWritableFields>;

/** `GET /admin/events` query. Results are always newest created first (no sort parameter). */
export interface AdminEventListQuery {
  status?: EventStatus;
  category?: EventCategory;
  organizer?: string;
  q?: string;
  city?: string;
  from?: string;
  to?: string;
  archived?: boolean;
  limit?: number;
  cursor?: string;
}
