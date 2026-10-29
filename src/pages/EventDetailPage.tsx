import { type ReactNode, useCallback, useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, Ban, ExternalLink, Pencil, Send } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError, errorMessage } from '../api/client';
import { archiveEvent, cancelEvent, getEvent, publishEvent, restoreEvent } from '../api/events';
import { EventStatusBadges } from '../components/events/EventStatusBadges';
import { ErrorAlert, SuccessAlert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FlashMessage } from '../components/ui/FlashMessage';
import { TextAreaField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useAsync } from '../hooks/useAsync';
import type { AdminEvent } from '../types/event';
import { formatDateTime } from '../utils/dates';
import { availableActions, type EventAction } from '../utils/eventActions';
import { categoryLabel, eventLocation, formatPrice } from '../utils/format';

type ConfirmableAction = Exclude<EventAction, 'edit'>;

const CONFIRM: Record<ConfirmableAction, { title: string; label: string; tone: 'primary' | 'danger'; body: string }> = {
  publish: {
    title: 'Publish this event?',
    label: 'Publish',
    tone: 'primary',
    body: 'It becomes visible to everyone in the Kinnoc apps and website. Its slug can no longer change.',
  },
  cancel: {
    title: 'Cancel this event?',
    label: 'Cancel event',
    tone: 'danger',
    body: 'It is removed from event lists, and people with the link see that it was cancelled. This cannot be undone.',
  },
  archive: {
    title: 'Archive this event?',
    label: 'Archive',
    tone: 'danger',
    body: 'It is hidden everywhere, including the public link. You can restore it from the Archived tab.',
  },
  restore: {
    title: 'Restore this event?',
    label: 'Restore',
    tone: 'primary',
    body: 'It comes back with the status it had before it was archived.',
  },
};

const SUCCESS: Record<ConfirmableAction, string> = {
  publish: 'The event is published.',
  cancel: 'The event is cancelled.',
  archive: 'The event is archived.',
  restore: 'The event is restored.',
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line text-slate-900 sm:col-span-2">{children || '—'}</dd>
    </div>
  );
}

function ExternalUrl({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
      {href}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function EventDetailPage() {
  const { id = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => getEvent(id, signal), [id]);
  const { data, error, loading, reload } = useAsync(load);

  // The event returned by the last successful action replaces the loaded copy.
  const [updated, setUpdated] = useState<AdminEvent | null>(null);
  const event = updated?.id === id ? updated : data;

  const [pending, setPending] = useState<ConfirmableAction | null>(null);
  const [running, setRunning] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runAction(action: ConfirmableAction) {
    if (!event) return;
    if (action === 'cancel' && reason.trim().length > 500) {
      setResult({ ok: false, message: 'The reason can be at most 500 characters.' });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      let next: AdminEvent;
      if (action === 'publish') next = await publishEvent(event.id);
      else if (action === 'cancel') next = await cancelEvent(event.id, reason.trim() || undefined);
      else if (action === 'restore') next = await restoreEvent(event.id);
      else {
        // Archiving returns 204, so fetch the event again to show its new state.
        await archiveEvent(event.id);
        try {
          next = await getEvent(event.id);
        } catch {
          setUpdated(null);
          reload();
          setResult({ ok: true, message: SUCCESS.archive });
          return;
        }
      }
      setUpdated(next);
      setResult({ ok: true, message: SUCCESS[action] });
    } catch (err) {
      let message = errorMessage(err);
      // Publishing reports what's missing as field details.
      if (err instanceof ApiError && err.fieldErrors.length) {
        message += `: ${err.fieldErrors.map((f) => f.errors.join(', ')).join('; ')}`;
      }
      setResult({ ok: false, message });
    } finally {
      setRunning(false);
      setPending(null);
      setReason('');
    }
  }

  if (loading && !event) return <Spinner label="Loading event…" />;

  if (!event) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="space-y-4">
        <Link to="/events" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to events
        </Link>
        <ErrorAlert
          title={notFound ? 'Event not found' : 'Could not load the event'}
          action={
            notFound ? undefined : (
              <Button variant="secondary" onClick={reload}>
                Retry
              </Button>
            )
          }
        >
          {notFound ? 'It may have been removed, or the link is wrong.' : errorMessage(error)}
        </ErrorAlert>
      </div>
    );
  }

  const actions = availableActions(event);

  return (
    <>
      <Link to="/events" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to events
      </Link>
      <PageHeader
        title={event.title}
        description={<EventStatusBadges event={event} />}
        actions={
          <>
            {actions.includes('edit') && (
              <ButtonLink variant="secondary" to={`/events/${event.id}/edit`}>
                <Pencil className="size-4" aria-hidden /> Edit
              </ButtonLink>
            )}
            {actions.includes('publish') && (
              <Button onClick={() => setPending('publish')}>
                <Send className="size-4" aria-hidden /> Publish
              </Button>
            )}
            {actions.includes('cancel') && (
              <Button variant="secondary" onClick={() => setPending('cancel')}>
                <Ban className="size-4" aria-hidden /> Cancel event
              </Button>
            )}
            {actions.includes('archive') && (
              <Button variant="secondary" onClick={() => setPending('archive')}>
                <Archive className="size-4" aria-hidden /> Archive
              </Button>
            )}
            {actions.includes('restore') && (
              <Button onClick={() => setPending('restore')}>
                <ArchiveRestore className="size-4" aria-hidden /> Restore
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        <FlashMessage />
        {result &&
          (result.ok ? <SuccessAlert>{result.message}</SuccessAlert> : <ErrorAlert>{result.message}</ErrorAlert>)}
        {event.status === 'CANCELLED' && (
          <ErrorAlert title={`Cancelled ${formatDateTime(event.cancelledAt, event.timezone)}`}>
            {event.cancellationReason ?? 'No reason given.'}
          </ErrorAlert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Details">
              <dl className="divide-y divide-slate-100">
                <Detail label="Summary">{event.summary}</Detail>
                <Detail label="Description">{event.description}</Detail>
                <Detail label="Category">{categoryLabel(event.category)}</Detail>
                <Detail label="Organizer">{event.organizerName}</Detail>
                <Detail label="Tags">{event.tags.join(', ')}</Detail>
                <Detail label="Slug">{event.slug}</Detail>
              </dl>
            </Card>
            <Card title="When and where">
              <dl className="divide-y divide-slate-100">
                <Detail label="Starts">{formatDateTime(event.startAt, event.timezone)}</Detail>
                <Detail label="Ends">{event.endAt && formatDateTime(event.endAt, event.timezone)}</Detail>
                <Detail label="Time zone">{event.timezone}</Detail>
                <Detail label="Location">{eventLocation(event)}</Detail>
                {event.isOnline ? (
                  <Detail label="Link to join">
                    <ExternalUrl href={event.onlineEventUrl} />
                  </Detail>
                ) : (
                  <Detail label="Address">
                    {[event.address, event.city, event.state, event.country].filter(Boolean).join(', ')}
                  </Detail>
                )}
              </dl>
            </Card>
            <Card title="Registration">
              <dl className="divide-y divide-slate-100">
                <Detail label="Registration link">
                  <ExternalUrl href={event.registrationUrl} />
                </Detail>
                <Detail label="Registration closes">
                  {event.registrationDeadline && formatDateTime(event.registrationDeadline, event.timezone)}
                </Detail>
                <Detail label="Capacity">{event.capacity?.toLocaleString()}</Detail>
                <Detail label="Price">{formatPrice(event.priceAmount, event.currency)}</Detail>
              </dl>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Poster">
              {event.coverImageUrl ? (
                <img src={event.coverImageUrl} alt={`Poster for ${event.title}`} className="w-full rounded-md" />
              ) : (
                <p className="text-sm text-slate-500">No poster yet.</p>
              )}
              {event.organizerLogoUrl && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-slate-500">Organizer logo</p>
                  <img src={event.organizerLogoUrl} alt="Organizer logo" className="size-20 rounded-md object-cover" />
                </div>
              )}
            </Card>
            <Card title="History">
              <dl className="divide-y divide-slate-100">
                <Detail label="Created">
                  {formatDateTime(event.createdAt)}
                  {event.createdBy && ` by ${event.createdBy.displayName}`}
                </Detail>
                <Detail label="Updated">
                  {formatDateTime(event.updatedAt)}
                  {event.updatedBy && ` by ${event.updatedBy.displayName}`}
                </Detail>
                <Detail label="Published">{event.publishedAt && formatDateTime(event.publishedAt)}</Detail>
                <Detail label="Archived">{event.archivedAt && formatDateTime(event.archivedAt)}</Detail>
              </dl>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? CONFIRM[pending].title : ''}
        confirmLabel={pending ? CONFIRM[pending].label : ''}
        tone={pending ? CONFIRM[pending].tone : 'primary'}
        loading={running}
        onCancel={() => {
          setPending(null);
          setReason('');
        }}
        onConfirm={() => pending && void runAction(pending)}
      >
        {pending && <p>{CONFIRM[pending].body}</p>}
        {pending === 'cancel' && (
          <TextAreaField
            label="Reason (optional)"
            hint="Shown to people who open the event's link. Up to 500 characters."
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={running}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
