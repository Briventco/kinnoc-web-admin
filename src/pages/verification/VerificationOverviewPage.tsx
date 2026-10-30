import { useCallback } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/client';
import type { ItemCount } from '../../api/pagination';
import { countApplications, countVerifications, listApplications } from '../../api/verification';
import { ApplicationTable } from '../../components/verification/ApplicationTable';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { ErrorAlert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';

function StatCard({ label, to, value, loading }: { label: string; to: string; value?: ItemCount; loading: boolean }) {
  let shown = '—';
  if (value) shown = value.exact ? String(value.count) : `${value.count}+`;
  return (
    <Link to={to} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? '…' : shown}</p>
    </Link>
  );
}

const loadStats = async (signal: AbortSignal) => {
  const [pending, active, rejected, revoked] = await Promise.all([
    countApplications('PENDING', signal),
    countVerifications('ACTIVE', signal),
    countApplications('REJECTED', signal),
    countVerifications('REVOKED', signal),
  ]);
  return { pending, active, rejected, revoked };
};

/** Counts come from paging through the lists; the API has no totals. */
export function VerificationOverviewPage() {
  const loadQueue = useCallback((signal: AbortSignal) => listApplications({ status: 'PENDING', limit: 5 }, signal), []);
  const stats = useAsync(loadStats);
  const queue = useAsync(loadQueue);
  const approximate = stats.data && Object.values(stats.data).some((count) => !count.exact);

  return (
    <>
      <PageHeader
        title="Verification"
        description="Review applications for the Kinnoc blue tick and manage verified users."
        actions={
          <ButtonLink to="/verification/grant">
            <BadgeCheck className="size-4" aria-hidden />
            Grant verification
          </ButtonLink>
        }
      />
      <VerificationTabs />

      <div className="space-y-6">
        {stats.error !== undefined ? (
          <ErrorAlert
            title="Statistics are unavailable"
            action={
              <Button variant="secondary" onClick={stats.reload}>
                Retry
              </Button>
            }
          >
            {errorMessage(stats.error)}
          </ErrorAlert>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Pending applications" to="/verification/applications" value={stats.data?.pending} loading={stats.loading} />
              <StatCard label="Active verifications" to="/verification/verified" value={stats.data?.active} loading={stats.loading} />
              <StatCard
                label="Rejected applications"
                to="/verification/applications?status=REJECTED"
                value={stats.data?.rejected}
                loading={stats.loading}
              />
              <StatCard
                label="Revoked verifications"
                to="/verification/verified?status=REVOKED"
                value={stats.data?.revoked}
                loading={stats.loading}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Active verifications are approved or granted and not expired.
              {approximate && ' "+" means there are at least that many; the API does not report totals.'}
            </p>
          </div>
        )}

        <Card
          title="Review queue"
          actions={
            <Link to="/verification/applications" className="text-sm font-medium text-indigo-600 hover:underline">
              View all pending
            </Link>
          }
        >
          {queue.loading && <Spinner />}
          {queue.error !== undefined && (
            <ErrorAlert
              action={
                <Button variant="secondary" onClick={queue.reload}>
                  Retry
                </Button>
              }
            >
              {errorMessage(queue.error)}
            </ErrorAlert>
          )}
          {queue.data && queue.data.items.length === 0 && (
            <EmptyState title="No pending applications" description="New applications appear here, oldest first." />
          )}
          {queue.data && queue.data.items.length > 0 && <ApplicationTable applications={queue.data.items} />}
        </Card>
      </div>
    </>
  );
}
