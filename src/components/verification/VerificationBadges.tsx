import { BadgeCheck } from 'lucide-react';
import type { AccountStatus, ApplicationStatus, VerificationStatus } from '../../types/verification';
import { Badge } from '../ui/Badge';

const APPLICATION = {
  PENDING: { tone: 'yellow', label: 'Pending' },
  APPROVED: { tone: 'green', label: 'Approved' },
  REJECTED: { tone: 'red', label: 'Rejected' },
  WITHDRAWN: { tone: 'gray', label: 'Withdrawn' },
} as const;

const VERIFICATION = {
  ACTIVE: { tone: 'green', label: 'Verified' },
  EXPIRED: { tone: 'yellow', label: 'Expired' },
  REVOKED: { tone: 'red', label: 'Revoked' },
} as const;

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={APPLICATION[status].tone}>{APPLICATION[status].label}</Badge>;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus | null }) {
  if (!status) return <Badge>Not verified</Badge>;
  return (
    <Badge tone={VERIFICATION[status].tone}>
      {status === 'ACTIVE' && <BadgeCheck className="mr-1 size-3" aria-hidden />}
      {VERIFICATION[status].label}
    </Badge>
  );
}

/** Shown only when the account isn't active, since that blocks a grant. */
export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  if (status === 'ACTIVE') return null;
  return <Badge tone="red">{status === 'SUSPENDED' ? 'Suspended account' : 'Deactivated account'}</Badge>;
}
