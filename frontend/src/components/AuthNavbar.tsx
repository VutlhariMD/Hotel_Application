
import { Link, NavLink } from 'react-router-dom';

export default function AuthNavbar() {
  return (
    <header className="auth-navbar">
      <Link to="/" className="auth-logo">
        SereneStay
      </Link>

      <nav className="auth-nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/login">Login</NavLink>
        <NavLink to="/register">Register</NavLink>
      </nav>
    </header>
  );
}
