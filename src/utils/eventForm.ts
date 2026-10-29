import { ApiError } from '../api/client';
import type {
  AdminEvent,
  CreateEventInput,
  EventCategory,
  EventWritableFields,
  UpdateEventInput,
} from '../types/event';
import { DEFAULT_TIMEZONE, isoToZonedLocal, isValidTimeZone, zonedLocalToIso } from './dates';

/**
 * Event form values (all strings, as the inputs hold them) and conversion to the
 * API payload. Validation mirrors kinnoc-api's DTOs and event-rules.ts so most
 * mistakes are caught before the request; the API remains the final check.
 */
export interface EventFormValues {
  title: string;
  slug: string;
  organizerName: string;
  category: EventCategory | '';
  summary: string;
  description: string;
  tags: string;
  startAt: string;
  endAt: string;
  timezone: string;
  registrationDeadline: string;
  isOnline: boolean;
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  onlineEventUrl: string;
  registrationUrl: string;
  capacity: string;
  priceAmount: string;
  currency: string;
  coverImageKey: string | null;
  organizerLogoKey: string | null;
}

export type EventFormField = keyof EventFormValues;
/** Inline errors by field; `form` holds errors that don't belong to one field. */
export type EventFormErrors = Partial<Record<EventFormField | 'form', string>>;

export function emptyEventForm(): EventFormValues {
  return {
    title: '',
    slug: '',
    organizerName: '',
    category: '',
    summary: '',
    description: '',
    tags: '',
    startAt: '',
    endAt: '',
    timezone: DEFAULT_TIMEZONE,
    registrationDeadline: '',
    isOnline: false,
    venueName: '',
    address: '',
    city: '',
    state: '',
    country: 'NG',
    onlineEventUrl: '',
    registrationUrl: '',
    capacity: '',
    priceAmount: '',
    currency: '',
    coverImageKey: null,
    organizerLogoKey: null,
  };
}

export function eventToForm(event: AdminEvent): EventFormValues {
  const tz = event.timezone;
  return {
    title: event.title,
    slug: event.slug,
    organizerName: event.organizerName,
    category: event.category,
    summary: event.summary ?? '',
    description: event.description ?? '',
    tags: event.tags.join(', '),
    startAt: isoToZonedLocal(event.startAt, tz),
    endAt: isoToZonedLocal(event.endAt, tz),
    timezone: tz,
    registrationDeadline: isoToZonedLocal(event.registrationDeadline, tz),
    isOnline: event.isOnline,
    venueName: event.venueName ?? '',
    address: event.address ?? '',
    city: event.city ?? '',
    state: event.state ?? '',
    country: event.country ?? '',
    onlineEventUrl: event.onlineEventUrl ?? '',
    registrationUrl: event.registrationUrl ?? '',
    capacity: event.capacity === null ? '' : String(event.capacity),
    priceAmount: event.priceAmount === null ? '' : String(event.priceAmount),
    currency: event.currency ?? '',
    coverImageKey: event.coverImageKey,
    organizerLogoKey: event.organizerLogoKey,
  };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG = /^[\p{Ll}\p{Lo}\p{N}][\p{Ll}\p{Lo}\p{N} &+-]{0,29}$/u;
const MAX_EVENT_MS = 31 * 24 * 60 * 60 * 1000;

const text = (value: string) => value.trim() || null;

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean);
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Form values → the API's field values (null for empty optional fields). */
export function formToFields(values: EventFormValues): EventWritableFields {
  const tz = values.timezone.trim();
  const tags = parseTags(values.tags);
  return {
    title: values.title.trim(),
    slug: values.slug.trim().toLowerCase(),
    organizerName: values.organizerName.trim(),
    category: values.category as EventCategory,
    startAt: zonedLocalToIso(values.startAt, tz) ?? '',
    timezone: tz,
    isOnline: values.isOnline,
    summary: text(values.summary),
    description: text(values.description),
    coverImageKey: values.coverImageKey,
    organizerLogoKey: values.organizerLogoKey,
    tags: tags.length ? tags : null,
    endAt: values.endAt ? zonedLocalToIso(values.endAt, tz) : null,
    venueName: text(values.venueName),
    address: text(values.address),
    city: text(values.city),
    state: text(values.state),
    country: text(values.country)?.toUpperCase() ?? null,
    onlineEventUrl: text(values.onlineEventUrl),
    registrationUrl: text(values.registrationUrl),
    registrationDeadline: values.registrationDeadline
      ? zonedLocalToIso(values.registrationDeadline, tz)
      : null,
    capacity: values.capacity.trim() ? Number(values.capacity) : null,
    priceAmount: values.priceAmount.trim() ? Number(values.priceAmount) : null,
    currency: text(values.currency)?.toUpperCase() ?? null,
  };
}

/** POST body: only the fields that have a value. */
export function formToCreateInput(values: EventFormValues, publish: boolean): CreateEventInput {
  const fields = formToFields(values);
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === '') continue;
    input[key] = value;
  }
  if (publish) input.publish = true;
  return input as unknown as CreateEventInput;
}

/** PATCH body: only fields that differ from `initial`; cleared optional fields become null. */
export function formToUpdateInput(initial: EventFormValues, values: EventFormValues): UpdateEventInput {
  const before = formToFields(initial);
  const after = formToFields(values);
  const input: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof EventWritableFields)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) input[key] = after[key];
  }
  return input as UpdateEventInput;
}

interface ValidateOptions {
  /** The event must be complete: publishing, or editing a published/cancelled event. */
  complete: boolean;
  /** Editing an existing event (the slug can't be cleared). */
  editing: boolean;
}

export function validateEventForm(values: EventFormValues, options: ValidateOptions): EventFormErrors {
  const errors: EventFormErrors = {};
  const set = (field: EventFormField, message: string) => {
    if (!errors[field]) errors[field] = message;
  };
  const maxLength = (field: EventFormField, max: number) => {
    const value = values[field];
    if (typeof value === 'string' && value.trim().length > max) set(field, `Use at most ${max} characters.`);
  };

  if (!values.title.trim()) set('title', 'Enter a title.');
  maxLength('title', 150);
  if (!values.organizerName.trim()) set('organizerName', 'Enter the organizer.');
  maxLength('organizerName', 120);
  if (!values.category) set('category', 'Choose a category.');

  const slug = values.slug.trim().toLowerCase();
  if (options.editing && !slug) set('slug', 'The slug cannot be empty.');
  if (slug && (slug.length < 3 || slug.length > 50 || !SLUG.test(slug))) {
    set('slug', 'Use 3–50 lowercase letters, digits and single hyphens.');
  }

  maxLength('summary', 300);
  maxLength('description', 10_000);
  maxLength('venueName', 150);
  maxLength('address', 300);
  maxLength('city', 100);
  maxLength('state', 100);

  const tz = values.timezone.trim();
  if (!tz) set('timezone', 'Choose a time zone.');
  else if (!isValidTimeZone(tz) || !/^(?:UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(tz)) {
    set('timezone', 'Use an IANA time zone such as Africa/Lagos.');
  }

  const start = values.startAt ? zonedLocalToIso(values.startAt, tz) : null;
  const end = values.endAt ? zonedLocalToIso(values.endAt, tz) : null;
  const deadline = values.registrationDeadline ? zonedLocalToIso(values.registrationDeadline, tz) : null;
  if (!values.startAt) set('startAt', 'Choose when the event starts.');
  else if (!start) set('startAt', 'Enter a valid date and time.');
  if (values.endAt && !end) set('endAt', 'Enter a valid date and time.');
  if (values.registrationDeadline && !deadline) set('registrationDeadline', 'Enter a valid date and time.');

  const startMs = start ? new Date(start).getTime() : null;
  const endMs = end ? new Date(end).getTime() : null;
  if (startMs !== null && endMs !== null) {
    if (endMs < startMs) set('endAt', 'The end must not be before the start.');
    else if (endMs - startMs > MAX_EVENT_MS) set('endAt', 'An event can last at most 31 days.');
  }
  const finishMs = endMs ?? startMs;
  if (deadline && finishMs !== null && new Date(deadline).getTime() > finishMs) {
    set('registrationDeadline', 'Registration must close before the event ends.');
  }

  if (values.country.trim() && !/^[A-Za-z]{2}$/.test(values.country.trim())) {
    set('country', 'Use a two-letter country code such as NG.');
  }
  for (const field of ['onlineEventUrl', 'registrationUrl'] as const) {
    const value = values[field].trim();
    if (value && !isHttpsUrl(value)) set(field, 'Use a full https:// link.');
  }

  const capacity = values.capacity.trim();
  if (capacity && (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 10_000_000)) {
    set('capacity', 'Use a whole number of at least 1.');
  }
  const price = values.priceAmount.trim();
  const currency = values.currency.trim();
  if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) {
    set('priceAmount', 'Use a number of 0 or more with at most two decimals (0 means free).');
  }
  if (currency && !/^[A-Za-z]{3}$/.test(currency)) set('currency', 'Use a three-letter code such as NGN.');
  if (price && !currency) set('currency', 'Set a currency with the price.');
  if (currency && !price) set('priceAmount', 'Set a price with the currency (0 for free).');

  const tags = parseTags(values.tags);
  if (tags.length > 10) set('tags', 'Use at most 10 tags.');
  else if (new Set(tags).size !== tags.length) set('tags', 'Remove the duplicate tags.');
  else if (tags.some((tag) => !TAG.test(tag))) {
    set('tags', 'Each tag: 1–30 letters, digits, spaces, "&", "+" or "-".');
  }

  if (options.complete) {
    if (!values.summary.trim()) set('summary', 'A summary is required to publish.');
    if (!values.description.trim()) set('description', 'A description is required to publish.');
    if (values.isOnline) {
      if (!values.onlineEventUrl.trim()) set('onlineEventUrl', 'Online events need a link to join.');
    } else {
      if (!values.venueName.trim()) set('venueName', 'In-person events need a venue.');
      if (!values.city.trim()) set('city', 'In-person events need a city.');
      if (!values.country.trim()) set('country', 'In-person events need a country.');
    }
  }
  return errors;
}

const FORM_FIELDS = new Set<string>(Object.keys(emptyEventForm()));

/** Maps an API error's `details` onto the form fields; anything else goes to `form`. */
export function apiErrorsToForm(error: unknown): EventFormErrors {
  if (!(error instanceof ApiError)) {
    return { form: error instanceof Error ? error.message : 'Something went wrong.' };
  }
  const errors: EventFormErrors = { form: error.message };
  if (error.code === 'SLUG_TAKEN') errors.slug = 'This slug is already in use.';
  if (error.code === 'INVALID_IMAGE_KEY') errors.coverImageKey = error.message;
  const unplaced: string[] = [];
  for (const { field, errors: messages } of error.fieldErrors) {
    const name = field.split('.')[0];
    if (FORM_FIELDS.has(name)) errors[name as EventFormField] = messages.join(' ');
    else unplaced.push(`${field}: ${messages.join(' ')}`);
  }
  if (unplaced.length) errors.form = `${error.message} (${unplaced.join('; ')})`;
  return errors;
}
