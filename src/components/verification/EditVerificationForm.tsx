import { type FormEvent, useState } from 'react';
import { errorMessage } from '../../api/client';
import type { AdminVerification, UpdateVerificationInput, VerificationCategory } from '../../types/verification';
import { isoToZonedLocal } from '../../utils/dates';
import {
  expiryProblem,
  localDateTimeToIso,
  validateVerificationDetails,
  type VerificationDetailsErrors,
  type VerificationDetailsValues,
} from '../../utils/verification';
import { ErrorAlert, SuccessAlert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CheckboxField, TextAreaField, TextField } from '../ui/FormField';
import { VerificationDetailsFields } from './VerificationDetailsFields';

const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface EditVerificationFormProps {
  verification: AdminVerification;
  /** Resolve once the API has confirmed; throw to show the error. */
  onSubmit: (input: UpdateVerificationInput) => Promise<void>;
}

/**
 * Changes category, organisation, position or expiry. Only changed fields are
 * sent. Moving the expiry into the future (or removing it) renews an expired
 * verification. Revoked verifications can't be edited; grant them again instead.
 */
export function EditVerificationForm({ verification, onSubmit }: EditVerificationFormProps) {
  const [details, setDetails] = useState<VerificationDetailsValues>({
    category: verification.category,
    organisation: verification.organisation,
    position: verification.position,
  });
  const initialExpiry = isoToZonedLocal(verification.expiresAt, browserZone);
  const [expiresAt, setExpiresAt] = useState(initialExpiry);
  const [noExpiry, setNoExpiry] = useState(!verification.expiresAt);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<VerificationDetailsErrors & { expiresAt?: string; note?: string }>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function changes(): UpdateVerificationInput {
    const input: UpdateVerificationInput = {};
    if (details.category !== verification.category) input.category = details.category as VerificationCategory;
    if (details.organisation.trim() !== verification.organisation) input.organisation = details.organisation.trim();
    if (details.position.trim() !== verification.position) input.position = details.position.trim();
    if (noExpiry) {
      if (verification.expiresAt) input.expiresAt = null;
    } else if (expiresAt !== initialExpiry || !verification.expiresAt) {
      input.expiresAt = localDateTimeToIso(expiresAt) ?? undefined;
    }
    return input;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = {
      ...validateVerificationDetails(details),
      expiresAt: noExpiry
        ? undefined
        : !expiresAt
          ? 'Choose an expiry, or tick "No expiry".'
          : expiresAt !== initialExpiry
            ? expiryProblem(expiresAt)
            : undefined,
      note: note.trim().length > 500 ? 'Use at most 500 characters.' : undefined,
    };
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) return;

    const input = changes();
    if (Object.keys(input).length === 0) {
      setResult({ ok: true, message: 'Nothing changed.' });
      return;
    }
    if (note.trim()) input.note = note.trim();
    setSaving(true);
    setResult(null);
    try {
      await onSubmit(input);
      setNote('');
      setResult({ ok: true, message: 'Verification details saved.' });
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {result && (result.ok ? <SuccessAlert>{result.message}</SuccessAlert> : <ErrorAlert>{result.message}</ErrorAlert>)}
      <div className="grid gap-4 sm:grid-cols-2">
        <VerificationDetailsFields values={details} errors={errors} disabled={saving} onChange={setDetails} />
        <div className="space-y-2">
          <TextField
            label="Expires"
            type="datetime-local"
            hint="In your local time. A future date renews an expired verification."
            value={noExpiry ? '' : expiresAt}
            error={errors.expiresAt}
            disabled={saving || noExpiry}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <CheckboxField
            label="No expiry"
            checked={noExpiry}
            disabled={saving}
            onChange={(e) => setNoExpiry(e.target.checked)}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            label="Note (optional)"
            rows={2}
            maxLength={500}
            hint="Recorded in the audit log only."
            value={note}
            error={errors.note}
            disabled={saving}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
