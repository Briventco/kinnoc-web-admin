import { Link } from 'react-router';
import type { AdminApplication } from '../../types/verification';
import { formatDateTime } from '../../utils/dates';
import { verificationCategoryLabel } from '../../utils/verification';
import { UserSummary } from './UserSummary';
import { ApplicationStatusBadge } from './VerificationBadges';

/** Applications as a table on wide screens and stacked rows on phones. */
export function ApplicationTable({ applications }: { applications: AdminApplication[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="hidden bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase md:table-header-group">
          <tr>
            <th className="px-4 py-3">Applicant</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {applications.map((application) => (
            <tr key={application.id} className="flex flex-col gap-2 p-4 hover:bg-slate-50 md:table-row md:p-0">
              <td className="md:px-4 md:py-3 md:align-top">
                <UserSummary user={application.user} link={false} />
              </td>
              <td className="md:max-w-sm md:px-4 md:py-3 md:align-top">
                <Link
                  to={`/verification/applications/${application.id}`}
                  className="font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                >
                  {verificationCategoryLabel(application.category)}
                </Link>
                <p className="text-xs break-words text-slate-600">
                  {application.position} · {application.organisation}
                </p>
                <p className="mt-1 line-clamp-2 text-xs break-words text-slate-500">{application.statement}</p>
              </td>
              <td className="text-slate-600 md:px-4 md:py-3 md:align-top">{formatDateTime(application.submittedAt)}</td>
              <td className="md:px-4 md:py-3 md:align-top">
                <div className="flex items-center justify-between gap-3 md:block">
                  <ApplicationStatusBadge status={application.status} />
                  <Link
                    to={`/verification/applications/${application.id}`}
                    className="text-sm font-medium text-indigo-600 hover:underline md:mt-2 md:block"
                  >
                    {application.status === 'PENDING' ? 'Review' : 'View'}
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
