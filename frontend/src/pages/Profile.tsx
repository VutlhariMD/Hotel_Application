import { useEffect, useState, type FormEvent } from 'react';
import { clearAuthError, updateProfile } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export default function Profile() {
  const dispatch = useAppDispatch();
  const { user, status, error } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    password: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      }));
    }
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const result = await dispatch(
      updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
        currentPassword: form.currentPassword || undefined,
      })
    );
    if (updateProfile.fulfilled.match(result)) {
      setSaved(true);
      setForm((f) => ({ ...f, password: '', currentPassword: '' }));
    }
  }

  return (
    <section className="profile-page">
      <div className="page-intro">
        <h1>Your profile</h1>
        <p className="muted">Update your contact details and password.</p>
      </div>

      <form className="auth-form profile-form" onSubmit={onSubmit}>
        {user?.avatar_url && (
          <img className="avatar" src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" />
        )}

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
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Optional"
          />
        </label>
        <label>
          Current password
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="Required only to change password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Leave blank to keep current"
            minLength={6}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {saved && <p className="success-msg">Profile updated.</p>}

        <button className="btn btn-primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
