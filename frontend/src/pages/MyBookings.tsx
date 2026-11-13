
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import  '../MyBookings.css';

import {
  cancelBooking,
  fetchMyBookings,
} from '../store/bookingsSlice';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatZAR } from '../utils/money';

export default function MyBookings() {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector(
    (s) => s.bookings
  );

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  async function handleCancel(id: number) {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancellingId(id);
    setCancelError('');

    try {
      await dispatch(cancelBooking(id)).unwrap();
      await dispatch(fetchMyBookings());
    } catch {
      setCancelError('Unable to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="bookings-page">

      <div className="bookings-header">
        <div>
          <span className="bookings-eyebrow">
            SERENESTAY / RESERVATIONS
          </span>

          <h1>My Bookings</h1>
          <p>View and manage your reservations.</p>
        </div>

        <span className="bookings-count">
          {list.length} Booking{list.length === 1 ? '' : 's'}
        </span>
      </div>

      {status === 'loading' && !list.length && (
        <p className="bookings-message">Loading bookings...</p>
      )}

      {error && <p className="bookings-error">{error}</p>}
      {cancelError && <p className="bookings-error">{cancelError}</p>}

      {status !== 'loading' && !error && !list.length && (
        <div className="bookings-empty">
          <h2>No bookings yet</h2>
          <p>Explore our rooms and book your next stay.</p>
          <Link to="/" className="booking-pay-btn">
            Browse Rooms
          </Link>
        </div>
      )}

      <div className="booking-list">
        {list.map((b) => (
          <article className="booking-item" key={b.id}>

            <img
              src={b.image_url}
              alt={b.room_name}
              className="booking-image"
            />

            <div className="booking-content">

              <div className="booking-top">
                <h2>{b.room_name}</h2>

                <span className={`booking-status status-${b.status}`}>
                  {b.status}
                </span>
              </div>

              <p className="booking-dates">
                {String(b.check_in).slice(0, 10)}
                {' → '}
                {String(b.check_out).slice(0, 10)}
              </p>

              <p className="booking-details">
                {b.rooms_count || 1} Room
                {(b.rooms_count || 1) === 1 ? '' : 's'}
                {' · '}
                {b.guests} Guest{b.guests === 1 ? '' : 's'}
              </p>

              <div className="booking-bottom">
                <strong className="booking-total">
                  {formatZAR(b.total_price)}
                </strong>

                <div className="booking-actions">

                  {b.status === 'pending' && (
                    <Link
                      to={`/pay/${b.id}`}
                      className="booking-pay-btn"
                    >
                      Pay Now
                    </Link>
                  )}

                  {b.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="booking-cancel-btn"
                      disabled={cancellingId !== null}
                      onClick={() => handleCancel(b.id)}
                    >
                      {cancellingId === b.id
                        ? 'Cancelling...'
                        : 'Cancel'}
                    </button>
                  )}

                </div>
              </div>

            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
