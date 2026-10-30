import type { AuditEntry } from '../../types/verification';
import { formatDateTime } from '../../utils/dates';
import { auditActionLabel, userLabel, verificationCategoryLabel } from '../../utils/verification';
import { EmptyState } from '../ui/EmptyState';

const FIELD_LABELS: Record<string, string> = {
  category: 'Category',
  organisation: 'Organisation',
  position: 'Position',
  expiresAt: 'Expires',
  notes: 'Notes',
  note: 'Note',
  reason: 'Reason',
  reactivated: 'Reactivated',
  closedApplicationId: 'Closed application',
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return key === 'expiresAt' ? 'Never' : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'expiresAt' && typeof value === 'string') return formatDateTime(value);
  if (key === 'category' && typeof value === 'string') {
    return verificationCategoryLabel(value as Parameters<typeof verificationCategoryLabel>[0]);
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** The entry's `details`: `changes` for updates (from → to), otherwise the values recorded. */
function Details({ details }: { details: Record<string, unknown> }) {
  const rows: [string, string][] = [];
  const changes = details.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (changes && typeof changes === 'object') {
    for (const [field, change] of Object.entries(changes)) {
      rows.push([FIELD_LABELS[field] ?? field, `${formatValue(field, change.from)} → ${formatValue(field, change.to)}`]);
    }
  }
  for (const [key, value] of Object.entries(details)) {
    if (key === 'changes') continue;
    rows.push([FIELD_LABELS[key] ?? key, formatValue(key, value)]);
  }
  if (!rows.length) return null;
  return (
    <dl className="mt-1 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[auto_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}</dt>
          <dd className="break-words whitespace-pre-line text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The verification audit log for one user, newest first (the API returns the latest 50). */
export function AuditHistory({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) {
    return <EmptyState title="No verification activity" description="Grants, reviews, updates and revocations appear here." />;
  }
  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
          <p className="text-sm font-medium text-slate-900">{auditActionLabel(entry.action)}</p>
          <p className="text-xs text-slate-500">
            {formatDateTime(entry.createdAt)} · by {entry.actor ? userLabel(entry.actor) : 'a deleted administrator'}
          </p>
          <Details details={entry.details} />
        </li>
      ))}
    </ol>
  );
}
