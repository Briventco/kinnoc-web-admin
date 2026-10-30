import { useCallback } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../../api/client';
import { listVerifications } from '../../api/verification';
import { VerificationTable } from '../../components/verification/VerificationTable';
import { VerificationTabs } from '../../components/verification/VerificationTabs';
import { ErrorAlert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { useCursorPaging } from '../../hooks/useCursorPaging';
import {
  VERIFICATION_CATEGORIES,
  VERIFICATION_STATUSES,
  type VerificationCategory,
  type VerificationStatus,
} from '../../types/verification';
import { verificationCategoryLabel } from '../../utils/verification';

const STATUS_LABELS: Record<VerificationStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/** Verification records, newest grants first. Defaults to active ones; "all" includes expired and revoked. */
export function VerifiedUsersPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status: VerificationStatus | undefined =
    statusParam === 'ALL'
      ? undefined
      : VERIFICATION_STATUSES.includes(statusParam as VerificationStatus)
        ? (statusParam as VerificationStatus)
        : 'ACTIVE';
  const categoryParam = params.get('category') as VerificationCategory | null;
  const category = categoryParam && VERIFICATION_CATEGORIES.includes(categoryParam) ? categoryParam : undefined;

  const paging = useCursorPaging(`${status ?? 'ALL'}|${category ?? ''}`);
  const { cursor } = paging;
  const load = useCallback(
    (signal: AbortSignal) => listVerifications({ status, category, limit: 20, cursor }, signal),
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
      <PageHeader
        title="Verification"
        description="Users with a verification record. Newest grants first."
        actions={
          <ButtonLink to="/verification/grant">
            <BadgeCheck className="size-4" aria-hidden />
            Grant verification
          </ButtonLink>
        }
      />
      <VerificationTabs />

      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <SelectField label="Status" value={status ?? 'ALL'} onChange={(e) => setFilter('status', e.target.value)}>
            {VERIFICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
            <option value="ALL">All</option>
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

        {loading && <Spinner label="Loading verified users…" />}
        {error !== undefined && (
          <ErrorAlert
            title="Could not load verified users"
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
            title={status ? `No ${STATUS_LABELS[status].toLowerCase()} verifications` : 'No verifications yet'}
            description="Approve an application or grant verification directly."
            action={<ButtonLink to="/verification/grant">Grant verification</ButtonLink>}
          />
        )}
        {data && data.items.length > 0 && <VerificationTable verifications={data.items} />}
        {data && <Pagination paging={paging} nextCursor={data.nextCursor} />}
      </div>
    </>
  );
}
