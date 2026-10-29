import type { AdminEvent } from '../types/event';

export type EventAction = 'edit' | 'publish' | 'cancel' | 'archive' | 'restore';

/**
 * Actions the API allows for the event's current state (kinnoc-api events.service.ts):
 * archived events can only be restored; publish needs a draft; cancel needs a
 * published event; edit and archive work on any event that isn't archived.
 */
export function availableActions(event: AdminEvent): EventAction[] {
  if (event.archivedAt) return ['restore'];
  const actions: EventAction[] = ['edit'];
  if (event.status === 'DRAFT') actions.push('publish');
  if (event.status === 'PUBLISHED') actions.push('cancel');
  actions.push('archive');
  return actions;
}
