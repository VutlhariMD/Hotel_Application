import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBooking, payBooking, clearBookingError } from '../store/bookingsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatZAR } from '../utils/money';

export default function Payment() {
  const { bookingId = '' } = useParams();
  const dispatch = useAppDispatch();
  const { current, payStatus, payError, lastPayment } = useAppSelector((s) => s.bookings);
  const [form, setForm] = useState({
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/30',
    cvc: '123',
  });

  useEffect(() => {
    dispatch(clearBookingError());
    dispatch(fetchBooking(bookingId));
  }, [dispatch, bookingId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await dispatch(
      payBooking({
        bookingId: Number(bookingId),
        cardNumber: form.cardNumber,
        expiry: form.expiry,
        cvc: form.cvc,
      })
    );
  }

  if (!current) {
    return <p className="pad">Loading booking…</p>;
  }

  const paid = current.status === 'paid' || payStatus === 'succeeded';

  if (paid) {
    return (
      <section className="pay-page">
        <div className="success-box">
          <h1>Payment successful</h1>
          <p className="muted">
            Your stay at <strong>{current.room_name}</strong> is confirmed.
          </p>
          {lastPayment?.payment && (
            <p className="meta">
              Stripe id: {lastPayment.payment.stripeId} · card ···· {lastPayment.payment.last4}
            </p>
          )}
          <p className="total">{formatZAR(current.total_price)} paid</p>
          <Link className="btn btn-primary" to="/bookings">
            View my bookings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pay-page">
      <form className="pay-form" onSubmit={onSubmit}>
        <h1>Pay for booking</h1>
        <p className="muted">
          {current.room_name} · {String(current.check_in).slice(0, 10)} →{' '}
          {String(current.check_out).slice(0, 10)}
        </p>
        <p className="total">{formatZAR(current.total_price)}</p>

        <div className="stripe-note">
          Dumb Stripe test mode — use card <code>4242 4242 4242 4242</code>
        </div>

        <label>
          Card number
          <input
            value={form.cardNumber}
            onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
            placeholder="4242 4242 4242 4242"
            required
          />
        </label>
        <div className="row">
          <label>
            Expiry
            <input
              value={form.expiry}
              onChange={(e) => setForm({ ...form, expiry: e.target.value })}
              placeholder="MM/YY"
              required
            />
          </label>
          <label>
            CVC
            <input
              value={form.cvc}
              onChange={(e) => setForm({ ...form, cvc: e.target.value })}
              placeholder="123"
              required
            />
          </label>
        </div>

        {payError && <p className="error">{payError}</p>}

        <button className="btn btn-primary" type="submit" disabled={payStatus === 'loading'}>
          {payStatus === 'loading' ? 'Processing…' : `Pay ${formatZAR(current.total_price)}`}
        </button>
      </form>
    </section>
  );
}
