import { Link } from 'react-router';
import type { AdminVerification } from '../../types/verification';
import { formatDateTime } from '../../utils/dates';
import { userRef, verificationCategoryLabel } from '../../utils/verification';
import { UserSummary } from './UserSummary';
import { VerificationStatusBadge } from './VerificationBadges';

/** Verification records as a table on wide screens and stacked rows on phones. */
export function VerificationTable({ verifications }: { verifications: AdminVerification[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="hidden bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase md:table-header-group">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Verified as</th>
            <th className="px-4 py-3">Granted</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {verifications.map((verification) => (
            <tr key={verification.id} className="flex flex-col gap-2 p-4 hover:bg-slate-50 md:table-row md:p-0">
              <td className="md:px-4 md:py-3 md:align-top">
                <UserSummary user={verification.user} />
              </td>
              <td className="md:px-4 md:py-3 md:align-top">
                <p className="font-medium text-slate-900">{verificationCategoryLabel(verification.category)}</p>
                <p className="text-xs break-words text-slate-600">
                  {verification.position} · {verification.organisation}
                </p>
              </td>
              <td className="text-slate-600 md:px-4 md:py-3 md:align-top">
                {formatDateTime(verification.grantedAt)}
                {verification.expiresAt && (
                  <p className="text-xs text-slate-500">Expires {formatDateTime(verification.expiresAt)}</p>
                )}
              </td>
              <td className="md:px-4 md:py-3 md:align-top">
                <div className="flex items-center justify-between gap-3 md:block">
                  <VerificationStatusBadge status={verification.status} />
                  <Link
                    to={`/verification/users/${encodeURIComponent(userRef(verification.user))}`}
                    className="text-sm font-medium text-indigo-600 hover:underline md:mt-2 md:block"
                  >
                    Manage
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
