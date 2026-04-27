import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PortalCard, PortalLayout, PortalTopBar } from '@/components/portal/PortalLayout';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setPending(false);
    if (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Could not reach Supabase. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY and restart the dev server.'
          : err.message,
      );
      return;
    }
    navigate('/home', { replace: true });
  };

  const fieldClass =
    'w-full rounded-lg border border-portal-border bg-portal-surface px-3 py-2 text-sm text-portal-ink shadow-sm outline-none focus:border-portal-accent focus:ring-2 focus:ring-portal-ring/25';

  return (
    <PortalLayout
      header={<PortalTopBar />}
      mainClassName="flex w-full flex-1 flex-col items-center justify-center px-4 py-10"
    >
      <PortalCard className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-portal-ink">Sign in</h1>
        <p className="mt-1 text-sm text-portal-muted">Use your Pūrākau Supabase account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-portal-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-portal-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className={fieldClass}
            />
          </div>
          {error ? <p className="text-sm text-portal-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-portal-accent py-2.5 text-sm font-medium text-white shadow-sm hover:bg-portal-accent-muted focus:outline-none focus:ring-2 focus:ring-portal-ring/40 disabled:opacity-50"
          >
            {pending ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp((v) => !v);
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-portal-muted underline-offset-4 hover:text-portal-ink hover:underline"
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </PortalCard>
    </PortalLayout>
  );
}
