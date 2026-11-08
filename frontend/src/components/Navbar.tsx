import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { logout } from '../store/authSlice';
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../store/notificationsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export default function Navbar() {
  const { user, token } = useAppSelector((s) => s.auth);
  const { list, unread } = useAppSelector((s) => s.notifications);
  const dispatch = useAppDispatch();
  const isAdmin = user?.role === 'admin';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      dispatch(clearNotifications());
      return;
    }
    dispatch(fetchNotifications());
    const timer = window.setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [dispatch, token]);

  return (
    <header className="nav">
      <Link to="/" className="brand">
        HHotel
      </Link>
      <nav className="nav-links">
        <NavLink to="/">Rooms</NavLink>
        <NavLink to="/location">Location</NavLink>
        {token ? (
          <>
            <NavLink to="/bookings">My bookings</NavLink>
            <NavLink to="/favorites">Favorites</NavLink>
            <NavLink to="/profile">Profile</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <div className="notif-wrap">
              <button
                type="button"
                className="btn btn-ghost btn-sm notif-btn"
                onClick={() => setOpen((v) => !v)}
                aria-label="Notifications"
              >
                Alerts{unread > 0 ? ` (${unread})` : ''}
              </button>
              {open && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <strong>Notifications</strong>
                    {unread > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => dispatch(markAllNotificationsRead())}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {!list.length && <p className="muted small">No notifications yet.</p>}
                  <ul className="notif-list">
                    {list.map((n) => (
                      <li key={n.id} className={n.read ? 'is-read' : ''}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!n.read) dispatch(markNotificationRead(n.id));
                          }}
                        >
                          <strong>{n.title}</strong>
                          <span>{n.message}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <span className="nav-user">{user?.name}</span>
            <button type="button" className="btn btn-ghost" onClick={() => dispatch(logout())}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
