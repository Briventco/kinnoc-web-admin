import { useCallback } from 'react';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router';
import { errorMessage } from '../api/client';
import { countEvents, listEvents } from '../api/events';
import type { ItemCount } from '../api/pagination';
import { useAuth } from '../auth/useAuth';
import { EventStatusBadges } from '../components/events/EventStatusBadges';
import { EventThumbnail } from '../components/events/EventTable';
import { ErrorAlert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useAsync } from '../hooks/useAsync';
import { formatDateTime } from '../utils/dates';

function StatCard({ label, value, loading }: { label: string; value?: ItemCount; loading: boolean }) {
  let shown = '—';
  if (value) shown = value.exact ? String(value.count) : `${value.count}+`;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? '…' : shown}</p>
    </div>
  );
}

const loadStats = async (signal: AbortSignal) => {
  const [total, published, drafts] = await Promise.all([
    countEvents({}, signal),
    countEvents({ status: 'PUBLISHED' }, signal),
    countEvents({ status: 'DRAFT' }, signal),
  ]);
  return { total, published, drafts };
};

/** Counts exclude archived events. The API has no totals endpoint; see countEvents(). */
export function OverviewPage() {
  const { admin } = useAuth();
  const loadRecent = useCallback((signal: AbortSignal) => listEvents({ limit: 5 }, signal), []);

  const stats = useAsync(loadStats);
  const recent = useAsync(loadRecent);
  const approximate =
    stats.data && !(stats.data.total.exact && stats.data.published.exact && stats.data.drafts.exact);

  return (
    <>
      <PageHeader
        title={`Welcome${admin?.displayName ? `, ${admin.displayName}` : ''}`}
        description="Manage Kinnoc events from here."
        actions={
          <ButtonLink to="/events/new">
            <PlusCircle className="size-4" aria-hidden />
            Create event
          </ButtonLink>
        }
      />

      <div className="space-y-6">
        {stats.error !== undefined ? (
          <ErrorAlert
            title="Statistics are unavailable"
            action={
              <Button variant="secondary" onClick={stats.reload}>
                Retry
              </Button>
            }
          >
            {errorMessage(stats.error)}
          </ErrorAlert>
        ) : (
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total events" value={stats.data?.total} loading={stats.loading} />
              <StatCard label="Published" value={stats.data?.published} loading={stats.loading} />
              <StatCard label="Drafts" value={stats.data?.drafts} loading={stats.loading} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Archived events are not counted.
              {approximate && ' "+" means there are at least that many; the API does not report totals.'}
            </p>
          </div>
        )}

        <Card
          title="Recently created"
          actions={
            <Link to="/events" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          }
        >
          {recent.loading && <Spinner />}
          {recent.error !== undefined && (
            <ErrorAlert
              action={
                <Button variant="secondary" onClick={recent.reload}>
                  Retry
                </Button>
              }
            >
              {errorMessage(recent.error)}
            </ErrorAlert>
          )}
          {recent.data && recent.data.items.length === 0 && (
            <EmptyState
              title="No events yet"
              description="Create the first event to see it here."
              action={<ButtonLink to="/events/new">Create event</ButtonLink>}
            />
          )}
          {recent.data && recent.data.items.length > 0 && (
            <ul className="divide-y divide-slate-200">
              {recent.data.items.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-3 py-3">
                  <EventThumbnail event={event} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/events/${event.id}`}
                      className="font-medium break-words text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDateTime(event.startAt, event.timezone)}</p>
                  </div>
                  <EventStatusBadges event={event} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
