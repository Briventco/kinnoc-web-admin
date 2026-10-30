import { type FormEvent, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { errorMessage } from '../../api/client';
import type { AdminUserSummary, GrantVerificationInput, VerificationCategory } from '../../types/verification';
import {
  expiryProblem,
  localDateTimeToIso,
  userLabel,
  validateVerificationDetails,
  type VerificationDetailsErrors,
  type VerificationDetailsValues,
  verificationCategoryLabel,
} from '../../utils/verification';
import { ErrorAlert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TextAreaField, TextField } from '../ui/FormField';
import { VerificationDetailsFields } from './VerificationDetailsFields';

interface GrantVerificationFormProps {
  user: AdminUserSummary;
  /** Resolve once the API has confirmed; throw to show the error. */
  onSubmit: (input: GrantVerificationInput) => Promise<void>;
}

/** Direct verification without an application, confirmed before it is sent. */
export function GrantVerificationForm({ user, onSubmit }: GrantVerificationFormProps) {
  const [details, setDetails] = useState<VerificationDetailsValues>({ category: '', organisation: '', position: '' });
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<VerificationDetailsErrors & { expiresAt?: string; note?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function review(e: FormEvent) {
    e.preventDefault();
    const problems = {
      ...validateVerificationDetails(details),
      expiresAt: expiryProblem(expiresAt),
      note: note.trim() ? (note.trim().length > 500 ? 'Use at most 500 characters.' : undefined) : 'Give a reason for the audit log.',
    };
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) return;
    setError(null);
    setConfirming(true);
  }

  async function grant() {
    setSaving(true);
    try {
      await onSubmit({
        category: details.category as VerificationCategory,
        organisation: details.organisation.trim(),
        position: details.position.trim(),
        expiresAt: localDateTimeToIso(expiresAt) ?? undefined,
        note: note.trim(),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <form onSubmit={review} noValidate className="space-y-4">
      {error && <ErrorAlert title="Verification was not granted">{error}</ErrorAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <VerificationDetailsFields values={details} errors={errors} disabled={saving} onChange={setDetails} />
        <TextField
          label="Expires"
          type="datetime-local"
          hint="Optional, in your local time. Leave empty for no expiry."
          value={expiresAt}
          error={errors.expiresAt}
          disabled={saving}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Reason"
            required
            rows={3}
            maxLength={500}
            hint="Recorded in the audit log only. Never shown to the user."
            value={note}
            error={errors.note}
            disabled={saving}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <BadgeCheck className="size-4" aria-hidden />
          Grant verification
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Grant verification?"
        confirmLabel="Grant"
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void grant()}
      >
        <p>
          <strong>{userLabel(user)}</strong> will get the blue tick as{' '}
          {details.category && verificationCategoryLabel(details.category)}, {details.position.trim()} at{' '}
          {details.organisation.trim()}.
        </p>
        <p>{expiresAt ? `It expires ${new Date(expiresAt).toLocaleString()}.` : 'It does not expire.'}</p>
        <p>Any pending application from this user will be closed as approved.</p>
      </ConfirmDialog>
    </form>
  );
}
