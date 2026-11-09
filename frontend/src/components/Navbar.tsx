
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import {
  BedDouble,
  MapPin,
  CalendarDays,
  Heart,
  UserRound,
  Bell,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from 'lucide-react';

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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    dispatch(logout());
    setOpen(false);
    closeMobile();
  };

  return (
    <>
      <button
        className="mobile-menu-btn"
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={23} /> : <Menu size={23} />}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobile}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <Link to="/" onClick={closeMobile}>
            SereneStay<span>.</span>
          </Link>
          <p>YOUR PERFECT GETAWAY</p>
        </div>

        <div className="sidebar-content">
          <p className="sidebar-label">MAIN MENU</p>

          <nav className="sidebar-nav">
            <NavLink to="/" end onClick={closeMobile}>
              <BedDouble size={20} />
              <span>Rooms</span>
            </NavLink>

            <NavLink to="/location" onClick={closeMobile}>
              <MapPin size={20} />
              <span>Location</span>
            </NavLink>

            {token && (
              <>
                <NavLink to="/bookings" onClick={closeMobile}>
                  <CalendarDays size={20} />
                  <span>My bookings</span>
                </NavLink>

                <NavLink to="/favorites" onClick={closeMobile}>
                  <Heart size={20} />
                  <span>Favorites</span>
                </NavLink>

                <NavLink to="/profile" onClick={closeMobile}>
                  <UserRound size={20} />
                  <span>Profile</span>
                </NavLink>

                {isAdmin && (
                  <NavLink to="/admin" onClick={closeMobile}>
                    <LayoutDashboard size={20} />
                    <span>Admin Dashboard</span>
                  </NavLink>
                )}

                <button
                  type="button"
                  className={`sidebar-item ${open ? 'selected' : ''}`}
                  onClick={() => setOpen(!open)}
                  aria-expanded={open}
                >
                  <Bell size={20} />
                  <span>Notifications</span>

                  {unread > 0 && (
                    <span className="sidebar-badge">{unread}</span>
                  )}
                </button>

                {open && (
                  <div className="sidebar-notifications">
                    <div className="sidebar-notif-head">
                      <strong>Notifications</strong>

                      {unread > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(markAllNotificationsRead())
                          }
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {!list.length && (
                      <p className="sidebar-empty">
                        No notifications yet.
                      </p>
                    )}

                    <ul className="sidebar-notif-list">
                      {list.map((n) => (
                        <li
                          key={n.id}
                          className={n.read ? 'is-read' : ''}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.read) {
                                dispatch(markNotificationRead(n.id));
                              }
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
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          {token ? (
            <>
              <div className="sidebar-user">
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>

                <div className="user-info">
                  <strong>{user?.name || 'User'}</strong>
                  <span>{isAdmin ? 'Administrator' : 'Guest'}</span>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
              >
                <LogOut size={19} />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <div className="sidebar-auth">
              <NavLink to="/login" onClick={closeMobile}>
                <LogIn size={19} />
                <span>Log in</span>
              </NavLink>

              <NavLink
                to="/register"
                className="sidebar-signup"
                onClick={closeMobile}
              >
                <UserPlus size={19} />
                <span>Sign up</span>
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
