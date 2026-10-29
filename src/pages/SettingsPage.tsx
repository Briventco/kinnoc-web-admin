import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { formatDateTime } from '../utils/dates';
import { env } from '../utils/env';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm break-words text-slate-900 sm:col-span-2">{value || '—'}</dd>
    </div>
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Read-only account details. The API has no profile, password or role endpoints for admins. */
export function SettingsPage() {
  const { admin, session, signOut } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Your administrator account." />
      <div className="space-y-6">
        <Card title="Account">
          <dl className="divide-y divide-slate-100">
            <Row label="Email" value={admin?.email ?? session?.user.email} />
            <Row label="Display name" value={admin?.displayName} />
            <Row label="Username" value={admin?.username ? `@${admin.username}` : null} />
            <Row label="Role" value={admin?.role} />
            <Row
              label="Last sign-in"
              value={session?.user.last_sign_in_at ? formatDateTime(session.user.last_sign_in_at) : null}
            />
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Password changes go through Supabase password recovery. Admin roles are granted and revoked by an
            operator with the API&apos;s scripts.
          </p>
        </Card>

        <Card title="Connection">
          <dl className="divide-y divide-slate-100">
            <Row label="API" value={env.apiBaseUrl} />
            <Row label="Supabase project" value={hostOf(env.supabaseUrl)} />
            <Row label="Image bucket" value={env.eventMediaBucket} />
          </dl>
        </Card>

        <Button variant="secondary" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </>
  );
}
