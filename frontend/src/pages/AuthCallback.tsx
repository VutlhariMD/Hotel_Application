import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyAuthSession } from '../store/authSlice';
import { useAppDispatch } from '../store/hooks';
import type { AuthResponse } from '../types';


export default function AuthCallback() {
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = params.get('data');
    if (!raw) {
      setError('Missing Google auth data');
      return;
    }

    try {
      const payload = JSON.parse(decodeURIComponent(raw)) as AuthResponse;
      if (!payload?.token || !payload?.user) {
        setError('Invalid Google auth payload');
        return;
      }
      dispatch(applyAuthSession(payload)).then(() => {
        navigate(payload.user.role === 'admin' ? '/admin' : '/', { replace: true });
      });
    } catch {
      setError('Could not finish Google sign-in');
    }
  }, [params, dispatch, navigate]);

  return (
    <section className="auth-page">
      <div className="auth-form">
        <h1>Signing you in…</h1>
        {error ? <p className="error">{error}</p> : <p className="muted">Finishing Google login.</p>}
      </div>
    </section>
  );
}
