import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { googleAuthUrl } from '../api/client';
import { register, clearAuthError, checkGoogleAuth } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { token, status, error, googleEnabled } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(checkGoogleAuth());
  }, [dispatch]);

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      navigate('/', { replace: true });
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="muted">Register, then book and pay for your stay.</p>

        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
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
            minLength={6}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Sign up'}
        </button>

        {googleEnabled && (
          <a className="btn btn-google" href={googleAuthUrl}>
            Continue with Google
          </a>
        )}

        <p className="muted small">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </section>
  );
}
