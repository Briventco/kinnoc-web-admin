import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import type { PendingImages } from '../../api/storage';
import { EVENT_CATEGORIES, type AdminEvent } from '../../types/event';
import { timeZoneOptions } from '../../utils/dates';
import {
  apiErrorsToForm,
  type EventFormErrors,
  type EventFormField,
  type EventFormValues,
  validateEventForm,
} from '../../utils/eventForm';
import { categoryLabel } from '../../utils/format';
import { ErrorAlert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../ui/FormField';
import { ImagePicker } from './ImagePicker';

interface EventFormProps {
  mode: 'create' | 'edit';
  initialValues: EventFormValues;
  /** The event being edited. */
  event?: AdminEvent;
  /** Throw to show the error on the form; resolve when the API has confirmed. */
  onSubmit: (values: EventFormValues, files: PendingImages, publish: boolean) => Promise<void>;
  cancelTo: string;
}

const zones = timeZoneOptions();

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card title={title}>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

/** Create and edit form for events. Field rules follow kinnoc-api docs/events.md §2. */
export function EventForm({ mode, initialValues, event, onSubmit, cancelTo }: EventFormProps) {
  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState<PendingImages>({ cover: null, logo: null });
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  const slugLocked = mode === 'edit' && event?.status !== 'DRAFT';
  // Published and cancelled events must stay complete.
  const mustStayComplete = mode === 'edit' && event?.status !== 'DRAFT';

  function set<K extends EventFormField>(field: K, value: EventFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const bind = (field: Exclude<EventFormField, 'isOnline' | 'coverImageKey' | 'organizerLogoKey'>) => ({
    value: values[field],
    error: errors[field],
    disabled: saving !== null,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(field, e.target.value as EventFormValues[typeof field]),
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publish = submitter?.name === 'publish';

    const problems = validateEventForm(values, {
      complete: publish || mustStayComplete,
      editing: mode === 'edit',
    });
    if (Object.keys(problems).length) {
      setErrors({ ...problems, form: 'Please fix the highlighted fields.' });
      return;
    }

    setErrors({});
    setSaving(publish ? 'publish' : 'draft');
    try {
      await onSubmit(values, files, publish);
    } catch (error) {
      setErrors(apiErrorsToForm(error));
      setSaving(null);
    }
  }

  const coverExistingUrl =
    event && values.coverImageKey && values.coverImageKey === event.coverImageKey ? event.coverImageUrl : null;
  const logoExistingUrl =
    event && values.organizerLogoKey && values.organizerLogoKey === event.organizerLogoKey
      ? event.organizerLogoUrl
      : null;
  const busy = saving !== null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.form && <ErrorAlert title="The event was not saved">{errors.form}</ErrorAlert>}

      <FormSection title="Basics">
        <div className="sm:col-span-2">
          <TextField label="Title" required maxLength={150} {...bind('title')} />
        </div>
        <TextField label="Organizer" required maxLength={120} {...bind('organizerName')} />
        <SelectField label="Category" required {...bind('category')}>
          <option value="">Choose a category</option>
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Slug"
          maxLength={50}
          placeholder={mode === 'create' ? 'Generated from the title' : undefined}
          hint={
            slugLocked
              ? 'The slug cannot change after publishing, so shared links keep working.'
              : 'Used in the event link. 3–50 lowercase letters, digits and hyphens.'
          }
          {...bind('slug')}
          disabled={busy || slugLocked}
        />
        <TextField
          label="Tags"
          placeholder="tech, startups"
          hint="Up to 10, separated by commas."
          {...bind('tags')}
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Summary"
            rows={2}
            maxLength={300}
            hint="Short text for event cards (up to 300 characters). Required to publish."
            {...bind('summary')}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            label="Description"
            rows={8}
            maxLength={10000}
            hint="Required to publish."
            {...bind('description')}
          />
        </div>
      </FormSection>

      <FormSection title="Date and time">
        <TextField
          label="Starts"
          type="datetime-local"
          required
          hint="Local time in the event's time zone."
          {...bind('startAt')}
        />
        <TextField label="Ends" type="datetime-local" hint="Optional. At most 31 days after the start." {...bind('endAt')} />
        <SelectField label="Time zone" required {...bind('timezone')}>
          {!zones.includes(values.timezone) && values.timezone && (
            <option value={values.timezone}>{values.timezone}</option>
          )}
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Registration closes"
          type="datetime-local"
          hint="Optional. Not after the event ends."
          {...bind('registrationDeadline')}
        />
      </FormSection>

      <FormSection title="Location">
        <div className="sm:col-span-2">
          <CheckboxField
            label="This is an online event"
            checked={values.isOnline}
            disabled={busy}
            onChange={(e) => set('isOnline', e.target.checked)}
          />
        </div>
        {values.isOnline ? (
          <div className="sm:col-span-2">
            <TextField
              label="Link to join"
              type="url"
              placeholder="https://"
              hint="Required to publish an online event."
              {...bind('onlineEventUrl')}
            />
          </div>
        ) : (
          <>
            <TextField label="Venue" hint="Required to publish." maxLength={150} {...bind('venueName')} />
            <TextField label="Address" maxLength={300} {...bind('address')} />
            <TextField label="City" hint="Required to publish." maxLength={100} {...bind('city')} />
            <TextField label="State or region" maxLength={100} {...bind('state')} />
            <TextField
              label="Country code"
              maxLength={2}
              placeholder="NG"
              hint="Two letters (ISO 3166-1). Required to publish."
              {...bind('country')}
            />
          </>
        )}
      </FormSection>

      <FormSection title="Registration and price">
        <div className="sm:col-span-2">
          <TextField
            label="Registration link"
            type="url"
            placeholder="https://"
            hint="External registration or ticketing page."
            {...bind('registrationUrl')}
          />
        </div>
        <TextField label="Capacity" type="number" min={1} step={1} inputMode="numeric" {...bind('capacity')} />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            hint="0 means free."
            {...bind('priceAmount')}
          />
          <TextField label="Currency" maxLength={3} placeholder="NGN" {...bind('currency')} />
        </div>
      </FormSection>

      <Card title="Images">
        <div className="space-y-6">
          <ImagePicker
            label="Poster"
            hint="JPEG, PNG or WebP, up to 5 MB."
            existingUrl={coverExistingUrl}
            file={files.cover ?? null}
            onFileChange={(file) => {
              setFiles((current) => ({ ...current, cover: file }));
              setErrors((current) => ({ ...current, coverImageKey: undefined }));
            }}
            onRemoveExisting={() => set('coverImageKey', null)}
            error={errors.coverImageKey}
            disabled={busy}
          />
          <ImagePicker
            label="Organizer logo"
            hint="Optional. JPEG, PNG or WebP, up to 5 MB."
            aspect="square"
            existingUrl={logoExistingUrl}
            file={files.logo ?? null}
            onFileChange={(file) => {
              setFiles((current) => ({ ...current, logo: file }));
              setErrors((current) => ({ ...current, organizerLogoKey: undefined }));
            }}
            onRemoveExisting={() => set('organizerLogoKey', null)}
            error={errors.organizerLogoKey}
            disabled={busy}
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <ButtonLink variant="ghost" to={cancelTo}>
          Cancel
        </ButtonLink>
        {mode === 'create' ? (
          <>
            <Button type="submit" name="draft" variant="secondary" loading={saving === 'draft'} disabled={busy}>
              Save as draft
            </Button>
            <Button type="submit" name="publish" loading={saving === 'publish'} disabled={busy}>
              Publish now
            </Button>
          </>
        ) : (
          <Button type="submit" name="save" loading={busy}>
            Save changes
          </Button>
        )}
      </div>
    </form>
  );
}
