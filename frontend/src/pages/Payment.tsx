import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  clearBookingError,
  completeStripePayment,
  createPaymentIntent,
  fetchBooking,
} from '../store/bookingsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatZAR } from '../utils/money';
import { api } from '../api/client';

let stripePromise: Promise<Stripe | null> | null = null;
let stripePromiseKey: string | null = null;

async function getStripe(publishableKey: string) {
  if (!stripePromise || stripePromiseKey !== publishableKey) {
    stripePromiseKey = publishableKey;
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function CheckoutForm({
  bookingId,
  amountLabel,
}: {
  bookingId: number;
  amountLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useAppDispatch();
  const { payStatus, payError } = useAppSelector((s) => s.bookings);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLocalError(null);
    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/pay/${bookingId}`,
      },
    });

    if (error) {
      setLocalError(error.message || 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await dispatch(
        completeStripePayment({
          bookingId,
          paymentIntentId: paymentIntent.id,
        })
      );
    } else {
      setLocalError(`Payment status: ${paymentIntent?.status || 'unknown'}`);
    }
    setSubmitting(false);
  }

  return (
    <form className="stripe-checkout" onSubmit={onSubmit}>
      <PaymentElement />
      {(localError || payError) && <p className="error">{localError || payError}</p>}
      <button
        className="btn btn-primary"
        type="submit"
        disabled={!stripe || !elements || submitting || payStatus === 'loading'}
      >
        {submitting || payStatus === 'loading' ? 'Processing…' : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}

export default function Payment() {
  const { bookingId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { current, payStatus, payError, lastPayment } = useAppSelector((s) => s.bookings);
  const token = useAppSelector((s) => s.auth.token);

  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<Stripe | null>(null);

  const numericBookingId = Number(bookingId);

  useEffect(() => {
    dispatch(clearBookingError());
    dispatch(fetchBooking(bookingId));
  }, [dispatch, bookingId]);

  // After 3DS redirect, Stripe appends payment_intent to the URL.
  useEffect(() => {
    const paymentIntentId =
      searchParams.get('payment_intent') || searchParams.get('payment_intent_id');
    const redirectStatus = searchParams.get('redirect_status');
    if (!paymentIntentId || !numericBookingId) return;
    if (redirectStatus && redirectStatus !== 'succeeded') {
      setSetupError('Payment was not completed. You can try again.');
      return;
    }
    void dispatch(
      completeStripePayment({
        bookingId: numericBookingId,
        paymentIntentId,
      })
    );
  }, [dispatch, numericBookingId, searchParams]);

  useEffect(() => {
    if (!token || !numericBookingId || !current || current.status === 'paid') return;
    if (searchParams.get('payment_intent') || searchParams.get('redirect_status')) return;

    let cancelled = false;

    async function setup() {
      setSetupError(null);
      try {
        const config = await api<{ publishableKey: string }>('/payments/config');
        if (cancelled) return;
        setPublishableKey(config.publishableKey);

        const stripe = await getStripe(config.publishableKey);
        if (cancelled) return;
        setStripeReady(stripe);

        const result = await dispatch(createPaymentIntent(numericBookingId));
        if (createPaymentIntent.fulfilled.match(result)) {
          if (!cancelled) setClientSecret(result.payload.clientSecret);
        } else if (!cancelled) {
          setSetupError(result.error.message || 'Failed to start payment');
        }
      } catch (err) {
        if (!cancelled) {
          setSetupError(err instanceof Error ? err.message : 'Failed to load Stripe');
        }
      }
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, [token, numericBookingId, current?.id, current?.status, dispatch, searchParams]);

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: 'stripe' as const,
              variables: {
                colorPrimary: '#1f6b4a',
                borderRadius: '4px',
              },
            },
          }
        : undefined,
    [clientSecret]
  );

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
      <div className="pay-form">
        <h1>Pay for booking</h1>
        <p className="muted">
          {current.room_name} · {String(current.check_in).slice(0, 10)} →{' '}
          {String(current.check_out).slice(0, 10)}
        </p>
        <p className="total">{formatZAR(current.total_price)}</p>

        <div className="stripe-note">
          Secured by Stripe. In test mode use card <code>4242 4242 4242 4242</code>, any future
          expiry, any CVC.
        </div>

        {(setupError || payError) && !clientSecret && (
          <p className="error">{setupError || payError}</p>
        )}

        {publishableKey && clientSecret && stripeReady && elementsOptions ? (
          <Elements stripe={stripeReady} options={elementsOptions}>
            <CheckoutForm
              bookingId={numericBookingId}
              amountLabel={formatZAR(current.total_price)}
            />
          </Elements>
        ) : (
          !setupError && <p className="muted">Preparing secure payment…</p>
        )}
      </div>
    </section>
  );
}
