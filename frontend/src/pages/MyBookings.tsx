import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, fetchMyBookings } from '../store/bookingsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatZAR } from '../utils/money';

export default function MyBookings() {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((s) => s.bookings);

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  return (
    <section className="bookings-page">
      <div className="page-intro">
        <h1>My bookings</h1>
        <p className="muted">Pending bookings still need payment.</p>
      </div>

      {status === 'loading' && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!list.length && status !== 'loading' && (
        <p className="muted">
          No bookings yet. <Link to="/">Browse rooms</Link>
        </p>
      )}

      <div className="booking-list">
        {list.map((b) => (
          <article key={b.id} className="booking-item">
            <img src={b.image_url} alt={b.room_name} />
            <div>
              <h2>{b.room_name}</h2>
              <p className="muted">
                {String(b.check_in).slice(0, 10)} → {String(b.check_out).slice(0, 10)} ·{' '}
                {b.rooms_count || 1} room{(b.rooms_count || 1) === 1 ? '' : 's'} · {b.guests} guest
                {b.guests === 1 ? '' : 's'}
              </p>
              <p className="total">{formatZAR(b.total_price)}</p>
              <span className={`badge badge-${b.status}`}>{b.status}</span>
              <div className="room-actions">
                {b.status === 'pending' && (
                  <Link className="btn btn-primary btn-sm" to={`/pay/${b.id}`}>
                    Pay now
                  </Link>
                )}
                {b.status !== 'cancelled' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (confirm('Cancel this booking?')) dispatch(cancelBooking(b.id));
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
