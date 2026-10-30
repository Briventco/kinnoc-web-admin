import { type ReactNode, useCallback, useState } from 'react';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError, errorMessage } from '../../api/client';
import {
  getUserVerification,
  grantVerification,
  revokeVerification,
  updateVerification,
} from '../../api/verification';
import { useAuth } from '../../auth/useAuth';
import { AuditHistory } from '../../components/verification/AuditHistory';
import { EditVerificationForm } from '../../components/verification/EditVerificationForm';
import { GrantVerificationForm } from '../../components/verification/GrantVerificationForm';
import { UserSummary } from '../../components/verification/UserSummary';
import { VerificationStatusBadge } from '../../components/verification/VerificationBadges';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { Alert, ErrorAlert, SuccessAlert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FlashMessage } from '../../components/ui/FlashMessage';
import { TextAreaField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime } from '../../utils/dates';
import { grantBlocker, userLabel, verificationCategoryLabel } from '../../utils/verification';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line text-slate-900 sm:col-span-2">{children || '—'}</dd>
    </div>
  );
}

/** One user's verification: details, edit, revoke, grant and audit history. `:userRef` is a username or user ID. */
export function VerificationUserPage() {
  const { userRef = '' } = useParams();
  const { session } = useAuth();
  const load = useCallback((signal: AbortSignal) => getUserVerification(userRef, signal), [userRef]);
  const { latest: data, error, loading, reload } = useAsync(load);

  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!data) {
    if (loading) return <Spinner label="Loading user…" />;
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4">
        <Link to="/verification/verified" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to verified users
        </Link>
        <ErrorAlert
          title={notFound ? 'User not found' : 'Could not load the user'}
          action={
            notFound ? undefined : (
              <Button variant="secondary" onClick={reload}>
                Retry
              </Button>
            )
          }
        >
          {notFound ? `No Kinnoc account matches “${userRef}”.` : errorMessage(error)}
        </ErrorAlert>
      </div>
    );
  }

  const { user, verification, history } = data;
  const isSelf = user.id === session?.user.id;
  const status = verification?.status ?? null;
  const blocker = grantBlocker(user, status, session?.user.id);
  // Grant for no record or a revoked one; an expired record is renewed through the edit form.
  const showGrant = !isSelf && (status === null || status === 'REVOKED');
  const reasonProblem = reason.trim().length > 500 ? 'Use at most 500 characters.' : undefined;

  async function revoke() {
    setRunning(true);
    setResult(null);
    try {
      await revokeVerification(user.id, reason.trim());
      setResult({ ok: true, message: 'Verification revoked. The blue tick no longer shows.' });
      reload();
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
    } finally {
      setRunning(false);
      setRevoking(false);
      setReason('');
    }
  }

  return (
    <>
      <PageHeader title="Verification" description={userLabel(user)} />
      <VerificationTabs />
      <Link to="/verification/verified" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to verified users
      </Link>

      <div className="space-y-4">
        <FlashMessage />
        {result && (result.ok ? <SuccessAlert>{result.message}</SuccessAlert> : <ErrorAlert>{result.message}</ErrorAlert>)}
        {isSelf && <Alert tone="info">This is your own account. Another administrator has to manage your verification.</Alert>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card
              title="Verification"
              actions={
                <div className="flex items-center gap-2">
                  <VerificationStatusBadge status={status} />
                  {loading && <span className="text-xs text-slate-500">Refreshing…</span>}
                </div>
              }
            >
              {verification ? (
                <>
                  <dl className="divide-y divide-slate-100">
                    <Detail label="Category">{verificationCategoryLabel(verification.category)}</Detail>
                    <Detail label="Position">{verification.position}</Detail>
                    <Detail label="Organisation">{verification.organisation}</Detail>
                    <Detail label="Granted">
                      {formatDateTime(verification.grantedAt)}
                      {verification.grantedBy && ` by ${userLabel(verification.grantedBy)}`}
                    </Detail>
                    <Detail label="Expires">{verification.expiresAt ? formatDateTime(verification.expiresAt) : 'Never'}</Detail>
                    <Detail label="Source">
                      {verification.applicationId ? (
                        <Link
                          to={`/verification/applications/${verification.applicationId}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Approved application
                        </Link>
                      ) : (
                        'Granted directly'
                      )}
                    </Detail>
                    {verification.revokedAt && (
                      <>
                        <Detail label="Revoked">
                          {formatDateTime(verification.revokedAt)}
                          {verification.revokedBy && ` by ${userLabel(verification.revokedBy)}`}
                        </Detail>
                        <Detail label="Revocation reason">{verification.revocationReason}</Detail>
                      </>
                    )}
                  </dl>
                  {status !== 'REVOKED' && !isSelf && (
                    <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                      <Button variant="danger" onClick={() => setRevoking(true)}>
                        <ShieldOff className="size-4" aria-hidden /> Revoke verification
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">This user has never been verified.</p>
              )}
            </Card>

            {verification && status !== 'REVOKED' && !isSelf && (
              <Card title={status === 'EXPIRED' ? 'Renew or edit' : 'Edit details'}>
                <EditVerificationForm
                  key={verification.grantedAt}
                  verification={verification}
                  onSubmit={async (input) => {
                    await updateVerification(user.id, input);
                    reload();
                  }}
                />
              </Card>
            )}

            {showGrant && (
              <Card title={status === 'REVOKED' ? 'Grant verification again' : 'Grant verification'}>
                {blocker ? (
                  <Alert tone="info">{blocker}</Alert>
                ) : (
                  <GrantVerificationForm
                    key={verification?.updatedAt ?? 'new'}
                    user={user}
                    onSubmit={async (input) => {
                      await grantVerification(user.id, input);
                      setResult({ ok: true, message: `${userLabel(user)} is now verified.` });
                      reload();
                    }}
                  />
                )}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card title="User">
              <UserSummary user={user} link={false} />
              <p className="mt-2 text-xs break-all text-slate-500">ID: {user.id}</p>
            </Card>
            <Card title="Audit history">
              <AuditHistory entries={history} />
              {history.length >= 50 && <p className="mt-3 text-xs text-slate-500">Showing the latest 50 entries.</p>}
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={revoking}
        title="Revoke verification?"
        confirmLabel="Revoke"
        tone="danger"
        loading={running}
        confirmDisabled={!reason.trim() || Boolean(reasonProblem)}
        onCancel={() => {
          setRevoking(false);
          setReason('');
        }}
        onConfirm={() => void revoke()}
      >
        <p>
          {userLabel(user)} loses the blue tick immediately. The record and its history are kept, and you can grant
          verification again later.
        </p>
        <TextAreaField
          label="Reason"
          required
          rows={3}
          maxLength={500}
          hint="Internal. Never shown to the user or the public."
          value={reason}
          error={reasonProblem}
          disabled={running}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
