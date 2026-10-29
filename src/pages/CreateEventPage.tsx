import { useNavigate } from 'react-router';
import { createEvent } from '../api/events';
import { type PendingImages, saveWithImages } from '../api/storage';
import { EventForm } from '../components/events/EventForm';
import { PageHeader } from '../components/ui/PageHeader';
import { emptyEventForm, type EventFormValues, formToCreateInput } from '../utils/eventForm';

const initialValues = emptyEventForm();

export function CreateEventPage() {
  const navigate = useNavigate();

  async function handleSubmit(values: EventFormValues, files: PendingImages, publish: boolean) {
    const event = await saveWithImages(files, (keys) =>
      createEvent(
        formToCreateInput(
          {
            ...values,
            coverImageKey: keys.cover ?? values.coverImageKey,
            organizerLogoKey: keys.logo ?? values.organizerLogoKey,
          },
          publish,
        ),
      ),
    );
    navigate(`/events/${event.id}`, {
      state: { flash: event.status === 'PUBLISHED' ? 'Event created and published.' : 'Draft saved.' },
    });
  }

  return (
    <>
      <PageHeader
        title="Create event"
        description="Save a draft at any time, even if it is incomplete. Publishing needs the fields marked “Required to publish”."
      />
      <EventForm mode="create" initialValues={initialValues} onSubmit={handleSubmit} cancelTo="/events" />
    </>
  );
}
