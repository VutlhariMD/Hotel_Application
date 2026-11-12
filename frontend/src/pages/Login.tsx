import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { googleAuthUrl } from '../api/client';
import { login, clearAuthError, checkGoogleAuth } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled.',
  google_not_configured: 'Google OAuth is not configured on the server.',
  google_token: 'Could not complete Google sign-in (token exchange failed).',
  google_profile: 'Could not load your Google profile.',
  google_failed: 'Google sign-in failed. Please try again.',
};

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { token, status, error, googleEnabled } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState({ email: 'guest@hhotel.com', password: 'password123' });
  const from = (location.state as { from?: string } | null)?.from || '/';
  const googleError = params.get('error');

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(checkGoogleAuth());
  }, [dispatch]);

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, navigate, from]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const role = result.payload.user.role;
      navigate(role === 'admin' ? '/admin' : from, { replace: true });
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form" onSubmit={onSubmit}>
        <h1>Welcome back</h1>
        <p className="muted">Log in to book a room, manage favorites, or open the admin panel.</p>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>

        {(error || googleError) && (
          <p className="error">{error || GOOGLE_ERRORS[googleError || ''] || googleError}</p>
        )}

        <button className="btn btn-primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Log in'}
        </button>

        {googleEnabled ? (
          <a className="btn btn-google" href={googleAuthUrl}>
            Continue with Google
          </a>
        ) : (
          <p className="muted small">
            Google sign-in is available once you add <code>GOOGLE_CLIENT_ID</code> and{' '}
            <code>GOOGLE_CLIENT_SECRET</code> to <code>backend/.env</code>.
          </p>
        )}

        <p className="muted small">
          Guest: guest@hhotel.com / password123
          <br />
          Admin: admin@hhotel.com / password123
          <br />
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </section>
  );
}
