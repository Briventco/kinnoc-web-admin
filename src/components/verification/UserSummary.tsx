import { Link } from 'react-router';
import type { AdminUserSummary } from '../../types/verification';
import { userRef } from '../../utils/verification';
import { AccountStatusBadge } from './VerificationBadges';

/** Display name, @username and account status, optionally linking to the user's verification page. */
export function UserSummary({ user, link = true }: { user: AdminUserSummary; link?: boolean }) {
  const name = user.displayName ?? (user.username ? `@${user.username}` : 'No profile');
  return (
    <div className="min-w-0">
      {link ? (
        <Link
          to={`/verification/users/${encodeURIComponent(userRef(user))}`}
          className="font-medium break-words text-slate-900 hover:text-indigo-600 hover:underline"
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium break-words text-slate-900">{name}</span>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {user.username ? <span>@{user.username}</span> : <span>No username</span>}
        <AccountStatusBadge status={user.accountStatus} />
      </div>
    </div>
  );
}
