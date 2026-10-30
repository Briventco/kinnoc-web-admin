import { type ReactNode, useCallback, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError, errorMessage } from '../../api/client';
import { approveApplication, getApplication, getUserVerification, rejectApplication } from '../../api/verification';
import { useAuth } from '../../auth/useAuth';
import { AuditHistory } from '../../components/verification/AuditHistory';
import { UserSummary } from '../../components/verification/UserSummary';
import { ApplicationStatusBadge, VerificationStatusBadge } from '../../components/verification/VerificationBadges';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { Alert, ErrorAlert, SuccessAlert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime } from '../../utils/dates';
import { expiryProblem, localDateTimeToIso, userLabel, verificationCategoryLabel } from '../../utils/verification';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line text-slate-900 sm:col-span-2">{children || '—'}</dd>
    </div>
  );
}

export function ApplicationDetailPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();

  const loadApplication = useCallback((signal: AbortSignal) => getApplication(id, signal), [id]);
  const app = useAsync(loadApplication);
  const application = app.latest;

  const applicantId = application?.user.id;
  const loadApplicant = useCallback(
    (signal: AbortSignal) => (applicantId ? getUserVerification(applicantId, signal) : Promise.resolve(null)),
    [applicantId],
  );
  const applicant = useAsync(loadApplicant);

  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function closeDialog() {
    setDialog(null);
    setExpiresAt('');
    setNotes('');
  }

  const expiryError = dialog === 'approve' ? expiryProblem(expiresAt) : undefined;
  const notesTooLong = notes.trim().length > 1000;
  const confirmDisabled = notesTooLong || (dialog === 'approve' ? Boolean(expiryError) : !notes.trim());

  async function run() {
    if (!application || !dialog) return;
    setRunning(true);
    setResult(null);
    try {
      if (dialog === 'approve') {
        await approveApplication(application.id, {
          expiresAt: localDateTimeToIso(expiresAt) ?? undefined,
          notes: notes.trim() || undefined,
        });
        setResult({ ok: true, message: `${userLabel(application.user)} is now verified.` });
      } else {
        await rejectApplication(application.id, notes.trim());
        setResult({ ok: true, message: 'The application was rejected.' });
      }
      app.reload();
      applicant.reload();
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
      // Someone else may have reviewed it meanwhile; show the current state.
      if (err instanceof ApiError && err.status === 409) app.reload();
    } finally {
      setRunning(false);
      closeDialog();
    }
  }

  if (!application) {
    if (app.loading) return <Spinner label="Loading application…" />;
    const notFound = app.error instanceof ApiError && app.error.status === 404;
    return (
      <div className="space-y-4">
        <Link to="/verification/applications" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to applications
        </Link>
        <ErrorAlert
          title={notFound ? 'Application not found' : 'Could not load the application'}
          action={
            notFound ? undefined : (
              <Button variant="secondary" onClick={app.reload}>
                Retry
              </Button>
            )
          }
        >
          {notFound ? 'The link may be wrong.' : errorMessage(app.error)}
        </ErrorAlert>
      </div>
    );
  }

  const isSelf = application.user.id === session?.user.id;
  const canReview = application.status === 'PENDING' && !isSelf;

  return (
    <>
      <PageHeader title="Verification" description="Review an application." />
      <VerificationTabs />
      <Link to="/verification/applications" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to applications
      </Link>

      <div className="space-y-4">
        {result && (result.ok ? <SuccessAlert>{result.message}</SuccessAlert> : <ErrorAlert>{result.message}</ErrorAlert>)}
        {application.status === 'PENDING' && isSelf && (
          <Alert tone="info">This is your own application. Another administrator has to review it.</Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card
              title="Application"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={application.status} />
                  {app.loading && <span className="text-xs text-slate-500">Refreshing…</span>}
                </div>
              }
            >
              <dl className="divide-y divide-slate-100">
                <Detail label="Category">{verificationCategoryLabel(application.category)}</Detail>
                <Detail label="Position">{application.position}</Detail>
                <Detail label="Organisation">{application.organisation}</Detail>
                <Detail label="Reason">{application.statement}</Detail>
                <Detail label="Submitted">{formatDateTime(application.submittedAt)}</Detail>
                {application.withdrawnAt && <Detail label="Withdrawn">{formatDateTime(application.withdrawnAt)}</Detail>}
                {application.reviewedAt && (
                  <>
                    <Detail label="Reviewed">
                      {formatDateTime(application.reviewedAt)}
                      {application.reviewedBy && ` by ${userLabel(application.reviewedBy)}`}
                    </Detail>
                    <Detail label="Review notes">{application.reviewNotes}</Detail>
                  </>
                )}
              </dl>
              {canReview && (
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => setDialog('reject')}>
                    <X className="size-4" aria-hidden /> Reject
                  </Button>
                  <Button onClick={() => setDialog('approve')}>
                    <Check className="size-4" aria-hidden /> Approve
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Applicant">
              <UserSummary user={application.user} />
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                Current status:
                {applicant.latest ? (
                  <VerificationStatusBadge status={applicant.latest.verification?.status ?? null} />
                ) : applicant.loading ? (
                  <span className="text-slate-400">…</span>
                ) : (
                  <span className="text-slate-400">unavailable</span>
                )}
              </div>
            </Card>
            <Card title="Verification history">
              {applicant.loading && !applicant.latest && <Spinner />}
              {applicant.error !== undefined && <ErrorAlert>{errorMessage(applicant.error)}</ErrorAlert>}
              {applicant.latest && <AuditHistory entries={applicant.latest.history} />}
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'approve' ? 'Approve this application?' : 'Reject this application?'}
        confirmLabel={dialog === 'approve' ? 'Approve' : 'Reject'}
        tone={dialog === 'approve' ? 'primary' : 'danger'}
        loading={running}
        confirmDisabled={confirmDisabled}
        onCancel={closeDialog}
        onConfirm={() => void run()}
      >
        {dialog === 'approve' ? (
          <>
            <p>
              {userLabel(application.user)} will get the blue tick as {verificationCategoryLabel(application.category)},{' '}
              {application.position} at {application.organisation}.
            </p>
            <TextField
              label="Expires (optional)"
              type="datetime-local"
              hint="In your local time. Leave empty for no expiry."
              value={expiresAt}
              error={expiresAt ? expiryError : undefined}
              disabled={running}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <TextAreaField
              label="Notes (optional)"
              rows={3}
              maxLength={1000}
              hint="Internal. Never shown to the applicant."
              value={notes}
              error={notesTooLong ? 'Use at most 1000 characters.' : undefined}
              disabled={running}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        ) : (
          <>
            <p>The applicant can apply again later.</p>
            <TextAreaField
              label="Reason"
              required
              rows={3}
              maxLength={1000}
              hint="Internal. Never shown to the applicant."
              value={notes}
              error={notesTooLong ? 'Use at most 1000 characters.' : undefined}
              disabled={running}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
