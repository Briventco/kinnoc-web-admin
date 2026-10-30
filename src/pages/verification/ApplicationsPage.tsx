import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../../api/client';
import { listApplications } from '../../api/verification';
import { ApplicationTable } from '../../components/verification/ApplicationTable';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { ErrorAlert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { useCursorPaging } from '../../hooks/useCursorPaging';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  VERIFICATION_CATEGORIES,
  type VerificationCategory,
} from '../../types/verification';
import { verificationCategoryLabel } from '../../utils/verification';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Pending (oldest first)',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Applications by status. The API always filters by one status (PENDING by
 * default, oldest first, as a review queue); other statuses are newest first.
 */
export function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') as ApplicationStatus | null;
  const status: ApplicationStatus = statusParam && APPLICATION_STATUSES.includes(statusParam) ? statusParam : 'PENDING';
  const categoryParam = params.get('category') as VerificationCategory | null;
  const category = categoryParam && VERIFICATION_CATEGORIES.includes(categoryParam) ? categoryParam : undefined;

  const paging = useCursorPaging(`${status}|${category ?? ''}`);
  const { cursor } = paging;
  const load = useCallback(
    (signal: AbortSignal) => listApplications({ status, category, limit: 20, cursor }, signal),
    [status, category, cursor],
  );
  const { data, error, loading, reload } = useAsync(load);

  function setFilter(key: 'status' | 'category', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <>
      <PageHeader title="Verification" description="Applications for the Kinnoc blue tick." />
      <VerificationTabs />

      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <SelectField label="Status" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            {APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Category" value={category ?? ''} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">Any category</option>
            {VERIFICATION_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {verificationCategoryLabel(value)}
              </option>
            ))}
          </SelectField>
        </div>

        {loading && <Spinner label="Loading applications…" />}
        {error !== undefined && (
          <ErrorAlert
            title="Could not load applications"
            action={
              <Button variant="secondary" onClick={reload}>
                Retry
              </Button>
            }
          >
            {errorMessage(error)}
          </ErrorAlert>
        )}
        {data && data.items.length === 0 && (
          <EmptyState
            title={status === 'PENDING' ? 'No applications waiting for review' : `No ${STATUS_LABELS[status].toLowerCase()} applications`}
            description={category ? 'Try another category.' : undefined}
          />
        )}
        {data && data.items.length > 0 && <ApplicationTable applications={data.items} />}
        {data && <Pagination paging={paging} nextCursor={data.nextCursor} />}
      </div>
    </>
  );
}
