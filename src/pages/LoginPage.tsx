import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Alert, ErrorAlert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/FormField';
import { FullPageSpinner } from '../components/ui/Spinner';
import { missingEnv } from '../utils/env';

/** Email and password sign-in. There is no sign-up: admins are created by an operator. */
export function LoginPage() {
  const { status, notice, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (status === 'admin') return <Navigate to={from} replace />;
  if (status === 'loading') return <FullPageSpinner />;

  const missing = missingEnv();
  const checking = status === 'checking';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Kinnoc <span className="text-indigo-600">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your administrator account.</p>
        </div>

        {missing.length > 0 && (
          <ErrorAlert title="The portal is not configured">
            Set {missing.join(', ')} in <code>.env.local</code> and restart the dev server. See the README.
          </ErrorAlert>
        )}
        {notice && <Alert tone="info">{notice}</Alert>}
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'unconfigured'}
            required
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'unconfigured'}
            required
          />
          <Button
            type="submit"
            className="w-full"
            loading={submitting || checking}
            disabled={status === 'unconfigured'}
          >
            {checking ? 'Checking access…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
