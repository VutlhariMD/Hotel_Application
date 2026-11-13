import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Rooms from './pages/Rooms';
import Login from './pages/Login';
import Register from './pages/Register';
import BookRoom from './pages/BookRoom';
import Payment from './pages/Payment';
import MyBookings from './pages/MyBookings';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Location from './pages/Location';
import Admin from './pages/Admin';
import RoomDetailsPage from './pages/RoomDetailsPage';
import Loginbar from './components/AuthNavbar';

export default function App() {

    const location = useLocation();

  // Pages that should display a top navbar
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/home';

  return (
   
   <div className={isAuthPage ? 'app auth-layout' : 'app'}>
  {isAuthPage ? <Loginbar /> : <Navbar />}

  <main className={isAuthPage ? 'main auth-main' : 'main'}>
        <Routes>
          <Route path="/" element={<Rooms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/location" element={<Location />} />
          <Route
            path="/book/:roomId"
            element={
              <ProtectedRoute>
                <BookRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pay/:bookingId"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }

          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/rooms" element={<Rooms />} />

<Route
  path="/rooms/:id"
  element={<RoomDetailsPage />}
/><Route path="/rooms/:id" element={<RoomDetailsPage />} />

        </Routes>

      </main>
    </div>
  );
}
