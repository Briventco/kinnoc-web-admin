import type { AdminEvent, EventCategory } from '../types/event';

/** "CONFERENCE" → "Conference". */
export function categoryLabel(category: EventCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/** "Main Auditorium, Osogbo" or "Online". */
export function eventLocation(event: Pick<AdminEvent, 'isOnline' | 'venueName' | 'city' | 'country'>): string {
  if (event.isOnline) return 'Online';
  const parts = [event.venueName, event.city, event.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location not set';
}

export function formatPrice(amount: number | null, currency: string | null): string {
  if (amount === null) return 'Not set';
  if (amount === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency ?? 'NGN' }).format(amount);
  } catch {
    return `${amount} ${currency ?? ''}`.trim();
  }
}
