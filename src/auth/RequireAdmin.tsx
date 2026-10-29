import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/Alert';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useAuth } from './useAuth';

/** Renders the admin pages only after the API has confirmed admin access. */
export function RequireAdmin() {
  const { status, error, retry, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading' || status === 'checking') {
    return <FullPageSpinner label="Checking your access…" />;
  }
  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
        <ErrorAlert title="Could not confirm your admin access">{error}</ErrorAlert>
        <div className="flex gap-2">
          <Button onClick={retry}>Try again</Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }
  if (status !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
