import type { AdminEvent } from '../../types/event';
import { Badge } from '../ui/Badge';

const STATUS_TONE = { DRAFT: 'yellow', PUBLISHED: 'green', CANCELLED: 'red' } as const;
const STATUS_LABEL = { DRAFT: 'Draft', PUBLISHED: 'Published', CANCELLED: 'Cancelled' } as const;

/** Status, plus "Archived" and "Past" where they apply. */
export function EventStatusBadges({ event }: { event: Pick<AdminEvent, 'status' | 'archivedAt' | 'isPast'> }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={STATUS_TONE[event.status]}>{STATUS_LABEL[event.status]}</Badge>
      {event.archivedAt && <Badge>Archived</Badge>}
      {event.isPast && <Badge tone="blue">Past</Badge>}
    </span>
  );
}
