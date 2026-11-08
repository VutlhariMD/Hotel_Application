import { Link, NavLink } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export default function Navbar() {
  const { user, token } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const isAdmin = user?.role === 'admin';

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
