import { type FormEvent, useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError, errorMessage } from '../../api/client';
import { getUserVerification, grantVerification } from '../../api/verification';
import { useAuth } from '../../auth/useAuth';
import { GrantVerificationForm } from '../../components/verification/GrantVerificationForm';
import { UserSummary } from '../../components/verification/UserSummary';
import { VerificationStatusBadge } from '../../components/verification/VerificationBadges';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { Alert, ErrorAlert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { grantBlocker, userLabel, userRef } from '../../utils/verification';

/**
 * Direct verification. The API has no user search, so admins look a user up by
 * exact username or user ID (GET /admin/verifications/users/:userRef).
 */
export function GrantVerificationPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const ref = params.get('user')?.trim() ?? '';
  const [input, setInput] = useState(ref);

  const load = useCallback(
    (signal: AbortSignal) => (ref ? getUserVerification(ref, signal) : Promise.resolve(null)),
    [ref],
  );
  const { data, error, loading, reload } = useAsync(load);

  function lookUp(e: FormEvent) {
    e.preventDefault();
    const value = input.trim().replace(/^@/, '');
    setParams(value ? { user: value } : {});
  }

  const notFound = error instanceof ApiError && error.status === 404;
  const blocker = data ? grantBlocker(data.user, data.verification?.status ?? null, session?.user.id) : null;

  return (
    <>
      <PageHeader title="Verification" description="Verify a user directly, without an application." />
      <VerificationTabs />

      <div className="space-y-6">
        <Card title="Find a user">
          <form onSubmit={lookUp} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <TextField
                label="Username or user ID"
                placeholder="e.g. ada or @ada"
                hint="Enter the exact username. Partial search is not available."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={!input.trim()} className="sm:mb-5">
              <Search className="size-4" aria-hidden />
              Look up
            </Button>
          </form>
        </Card>

        {ref && loading && <Spinner label="Looking up the user…" />}
        {ref && error !== undefined && (
          <ErrorAlert
            title={notFound ? 'No user found' : 'Could not look up the user'}
            action={
              notFound ? undefined : (
                <Button variant="secondary" onClick={reload}>
                  Retry
                </Button>
              )
            }
          >
            {notFound ? `No Kinnoc account has the username or ID “${ref}”.` : errorMessage(error)}
          </ErrorAlert>
        )}

        {data && (
          <Card title="User">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <UserSummary user={data.user} />
              <VerificationStatusBadge status={data.verification?.status ?? null} />
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              {blocker ? (
                <Alert
                  tone="info"
                  action={
                    data.verification && (
                      <Link
                        to={`/verification/users/${encodeURIComponent(userRef(data.user))}`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Manage
                      </Link>
                    )
                  }
                >
                  {blocker}
                </Alert>
              ) : (
                <GrantVerificationForm
                  key={data.user.id}
                  user={data.user}
                  onSubmit={async (grant) => {
                    await grantVerification(data.user.id, grant);
                    navigate(`/verification/users/${encodeURIComponent(userRef(data.user))}`, {
                      state: { flash: `${userLabel(data.user)} is now verified.` },
                    });
                  }}
                />
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
