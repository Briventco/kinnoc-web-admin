import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError, errorMessage } from '../api/client';
import { getEvent, updateEvent } from '../api/events';
import { deleteEventImage, type PendingImages, saveWithImages } from '../api/storage';
import { EventForm } from '../components/events/EventForm';
import { Alert, ErrorAlert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useAsync } from '../hooks/useAsync';
import type { AdminEvent } from '../types/event';
import { eventToForm, type EventFormValues, formToUpdateInput } from '../utils/eventForm';

export function EditEventPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const load = useCallback((signal: AbortSignal) => getEvent(id, signal), [id]);
  const { data: event, error, loading, reload } = useAsync(load);

  async function handleSubmit(original: AdminEvent, values: EventFormValues, files: PendingImages) {
    const initial = eventToForm(original);
    const saved = await saveWithImages(files, async (keys) => {
      const input = formToUpdateInput(initial, {
        ...values,
        coverImageKey: keys.cover ?? values.coverImageKey,
        organizerLogoKey: keys.logo ?? values.organizerLogoKey,
      });
      if (Object.keys(input).length === 0) return null;
      return updateEvent(original.id, input);
    });

    if (!saved) {
      navigate(`/events/${original.id}`, { state: { flash: 'Nothing changed.' } });
      return;
    }
    // The API can't delete Storage files, so remove images this save replaced.
    if (original.coverImageKey && original.coverImageKey !== saved.coverImageKey) {
      void deleteEventImage(original.coverImageKey);
    }
    if (original.organizerLogoKey && original.organizerLogoKey !== saved.organizerLogoKey) {
      void deleteEventImage(original.organizerLogoKey);
    }
    navigate(`/events/${original.id}`, { state: { flash: 'Changes saved.' } });
  }

  if (loading) return <Spinner label="Loading event…" />;

  if (!event) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
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
    );
  }

  return (
    <>
      <Link
        to={`/events/${event.id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to event
      </Link>
      <PageHeader title="Edit event" description={event.title} />
      {event.archivedAt ? (
        <Alert
          tone="info"
          title="Archived events can't be edited"
          action={<ButtonLink to={`/events/${event.id}`}>Go to event</ButtonLink>}
        >
          Restore the event first.
        </Alert>
      ) : (
        <EventForm
          key={event.updatedAt}
          mode="edit"
          event={event}
          initialValues={eventToForm(event)}
          onSubmit={(values, files) => handleSubmit(event, values, files)}
          cancelTo={`/events/${event.id}`}
        />
      )}
    </>
  );
}
