import type { Page } from '../types/api';
import type {
  AdminEvent,
  AdminEventListQuery,
  CreateEventInput,
  UpdateEventInput,
} from '../types/event';
import { apiRequest } from './client';
import { countPages, type ItemCount } from './pagination';

/** Admin event endpoints (kinnoc-api docs/events.md §3). Admin routes take IDs, not slugs. */

export function listEvents(
  query: AdminEventListQuery = {},
  signal?: AbortSignal,
): Promise<Page<AdminEvent>> {
  const { archived, ...rest } = query;
  return apiRequest<Page<AdminEvent>>('/admin/events', {
    query: { ...rest, archived: archived ? 'true' : undefined },
    signal,
  });
}

export function getEvent(id: string, signal?: AbortSignal): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, { signal });
}

export function createEvent(input: CreateEventInput): Promise<AdminEvent> {
  return apiRequest<AdminEvent>('/admin/events', { method: 'POST', body: input });
}

export function updateEvent(id: string, input: UpdateEventInput): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

/** DRAFT → PUBLISHED. Fails with INVALID_EVENT if incomplete or already over. */
export function publishEvent(id: string): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });
}

/** PUBLISHED → CANCELLED. The reason is shown on the public event page. */
export function cancelEvent(id: string, reason?: string): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

/** Soft delete (204). Idempotent. */
export function archiveEvent(id: string): Promise<void> {
  return apiRequest<void>(`/admin/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Un-archives, keeping the status. */
export function restoreEvent(id: string): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  });
}

/** Event count via paging (the API has no totals); a lower bound past 200. */
export function countEvents(
  query: Omit<AdminEventListQuery, 'limit' | 'cursor'>,
  signal?: AbortSignal,
): Promise<ItemCount> {
  return countPages((cursor) => listEvents({ ...query, limit: 50, cursor }, signal));
}
