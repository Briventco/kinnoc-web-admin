import { useCallback } from 'react';
import { PlusCircle } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../api/client';
import { listEvents } from '../api/events';
import { EventFilters, type EventFilterValues } from '../components/events/EventFilters';
import { EventTable } from '../components/events/EventTable';
import { ErrorAlert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FlashMessage } from '../components/ui/FlashMessage';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Spinner } from '../components/ui/Spinner';
import { useAsync } from '../hooks/useAsync';
import { useCursorPaging } from '../hooks/useCursorPaging';
import type { EventCategory, EventStatus } from '../types/event';
import { localDateToIso } from '../utils/dates';

const PAGE_SIZE = 20;
const FILTER_KEYS = ['q', 'status', 'category', 'city', 'from', 'to'] as const;

/**
 * Filters live in the URL so they survive reloads and the back button. The API
 * pages with cursors only (no totals or page numbers), so "Previous" replays the
 * cursors we have already seen. Results are newest created first; the admin
 * endpoint has no sort parameter.
 */
export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const archived = params.get('archived') === 'true';
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? ''])) as unknown as EventFilterValues;
  const filterKey = params.toString();

  const paging = useCursorPaging(filterKey);
  const { cursor } = paging;

  const load = useCallback(
    (signal: AbortSignal) =>
      listEvents(
        {
          q: filters.q || undefined,
          status: (filters.status || undefined) as EventStatus | undefined,
          category: (filters.category || undefined) as EventCategory | undefined,
          city: filters.city || undefined,
          from: localDateToIso(filters.from),
          to: localDateToIso(filters.to),
          archived,
          limit: PAGE_SIZE,
          cursor,
        },
        signal,
      ),
    // filterKey captures every filter value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, cursor],
  );
  const { data, error, loading, reload } = useAsync(load);

  function updateParams(next: Partial<EventFilterValues> & { archived?: boolean }) {
    const merged = new URLSearchParams();
    const values = { ...filters, ...next };
    for (const key of FILTER_KEYS) if (values[key]) merged.set(key, values[key]);
    if (next.archived ?? archived) merged.set('archived', 'true');
    setParams(merged);
  }

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);

  return (
    <>
      <PageHeader
        title="Events"
        description="Every event, including drafts. Newest created first."
        actions={
          <ButtonLink to="/events/new">
            <PlusCircle className="size-4" aria-hidden />
            Create event
          </ButtonLink>
        }
      />
      <FlashMessage />

      <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
        {[
          { label: 'Active', value: false },
          { label: 'Archived', value: true },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={archived === tab.value}
            onClick={() => updateParams({ archived: tab.value })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              archived === tab.value
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Remount when the URL changes so the text inputs show the applied values. */}
        <EventFilters key={filterKey} values={filters} onChange={(values) => updateParams(values)} />

        {hasFilters && (
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:underline"
            onClick={() => setParams(archived ? { archived: 'true' } : {})}
          >
            Clear filters
          </button>
        )}

        {loading && <Spinner label="Loading events…" />}

        {error !== undefined && (
          <ErrorAlert
            title="Could not load events"
            action={
              <Button variant="secondary" onClick={reload}>
                Retry
              </Button>
            }
          >
            {errorMessage(error)}
          </ErrorAlert>
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title={hasFilters ? 'No events match these filters' : archived ? 'No archived events' : 'No events yet'}
            description={
              hasFilters
                ? 'Try different filters.'
                : archived
                  ? 'Archived events appear here and can be restored.'
                  : 'Create an event to get started.'
            }
            action={!hasFilters && !archived ? <ButtonLink to="/events/new">Create event</ButtonLink> : undefined}
          />
        )}

        {data && data.items.length > 0 && <EventTable events={data.items} />}

        {data && <Pagination paging={paging} nextCursor={data.nextCursor} />}
      </div>
    </>
  );
}
