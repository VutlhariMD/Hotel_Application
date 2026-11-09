import { Router, type Request, type Response } from 'express';
import type Stripe from 'stripe';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Booking } from '../types.js';
import { createNotification } from '../utils/notifications.js';
import {
  getStripe,
  getStripePublishableKey,
  toStripeAmount,
} from '../utils/stripe.js';

const router = Router();

async function markBookingPaid(opts: {
  bookingId: number;
  userId: number;
  amount: number;
  stripeId: string;
  last4: string;
}): Promise<{ alreadyPaid: boolean }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query<Booking>(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [opts.bookingId, opts.userId]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Booking not found'), { status: 404 });
    }

    if (booking.status === 'paid') {
      await client.query('COMMIT');
      return { alreadyPaid: true };
    }

    const existing = await client.query(
      `SELECT id FROM payments WHERE booking_id = $1 OR stripe_id = $2 LIMIT 1`,
      [booking.id, opts.stripeId]
    );
    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO payments (booking_id, amount, card_last4, stripe_id, status)
         VALUES ($1, $2, $3, $4, 'succeeded')`,
        [booking.id, opts.amount, opts.last4, opts.stripeId]
      );
    }

    await client.query(`UPDATE bookings SET status = 'paid' WHERE id = $1`, [booking.id]);
    await client.query('COMMIT');

    const roomName = await pool.query<{ name: string }>(
      'SELECT name FROM rooms WHERE id = $1',
      [booking.room_id]
    );
    await createNotification(
      opts.userId,
      'Payment confirmed',
      `Payment for ${roomName.rows[0]?.name || 'your stay'} succeeded. Booking #${booking.id} is confirmed.`,
      'payment'
    );

    return { alreadyPaid: false };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Transaction may already be closed.
    }
    throw err;
  } finally {
    client.release();
  }
}

function paymentMethodLast4(paymentMethod: Stripe.PaymentMethod | string | null): string {
  if (!paymentMethod || typeof paymentMethod === 'string') return '****';
  return paymentMethod.card?.last4 || '****';
}

router.get('/config', (_req: Request, res: Response) => {
  try {
    res.json({
      publishableKey: getStripePublishableKey(),
      currency: 'zar',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        'Stripe is not configured. Set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in backend/.env',
    });
  }
});

router.post('/create-intent', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { bookingId } = req.body as { bookingId?: number };

  if (!bookingId) {
    res.status(400).json({ message: 'Booking id is required' });
    return;
  }

  try {
    const stripe = getStripe();
    const bookingResult = await pool.query<Booking>(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
      [bookingId, authed.user.id]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (booking.status === 'paid') {
      res.status(400).json({ message: 'Booking already paid' });
      return;
    }
    if (booking.status === 'cancelled') {
      res.status(400).json({ message: 'Cannot pay for a cancelled booking' });
      return;
    }

    const room = await pool.query<{ name: string }>(
      'SELECT name FROM rooms WHERE id = $1',
      [booking.room_id]
    );

    const amount = toStripeAmount(Number(booking.total_price));
    if (amount < 100) {
      res.status(400).json({ message: 'Booking amount is too low for Stripe (min R1.00)' });
      return;
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'zar',
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: String(booking.id),
        userId: String(authed.user.id),
      },
      description: `Booking #${booking.id} · ${room.rows[0]?.name || 'Room'}`,
      receipt_email: authed.user.email || undefined,
    });

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: Number(booking.total_price),
    });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.includes('STRIPE_SECRET_KEY')
        ? err.message
        : 'Failed to start Stripe payment';
    res.status(500).json({ message });
  }
});

router.post('/complete', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { bookingId, paymentIntentId } = req.body as {
    bookingId?: number;
    paymentIntentId?: string;
  };

  if (!bookingId || !paymentIntentId) {
    res.status(400).json({ message: 'Booking id and payment intent id are required' });
    return;
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });

    if (intent.status !== 'succeeded') {
      res.status(402).json({ message: `Payment not completed (status: ${intent.status})` });
      return;
    }

    const metaBookingId = Number(intent.metadata.bookingId);
    const metaUserId = Number(intent.metadata.userId);
    if (metaBookingId !== bookingId || metaUserId !== authed.user.id) {
      res.status(403).json({ message: 'Payment does not match this booking' });
      return;
    }

    const expected = await pool.query<Booking>(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
      [bookingId, authed.user.id]
    );
    const booking = expected.rows[0];
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (intent.amount !== toStripeAmount(Number(booking.total_price))) {
      res.status(400).json({ message: 'Paid amount does not match booking total' });
      return;
    }

    const last4 = paymentMethodLast4(
      intent.payment_method as Stripe.PaymentMethod | string | null
    );

    await markBookingPaid({
      bookingId,
      userId: authed.user.id,
      amount: Number(booking.total_price),
      stripeId: intent.id,
      last4,
    });

    res.json({
      message: 'Payment successful',
      bookingId,
      payment: {
        stripeId: intent.id,
        amount: Number(booking.total_price),
        last4,
        status: 'succeeded',
      },
    });
  } catch (err) {
    console.error(err);
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({
      message: err instanceof Error ? err.message : 'Payment confirmation failed',
    });
  }
});

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    res.status(500).json({ message: 'STRIPE_WEBHOOK_SECRET is not configured' });
    return;
  }
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ message: 'Missing Stripe signature' });
    return;
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      webhookSecret
    );

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = Number(intent.metadata.bookingId);
      const userId = Number(intent.metadata.userId);
      if (bookingId && userId) {
        let last4 = '****';
        if (intent.payment_method) {
          const pm =
            typeof intent.payment_method === 'string'
              ? await stripe.paymentMethods.retrieve(intent.payment_method)
              : intent.payment_method;
          last4 = paymentMethodLast4(pm);
        }
        await markBookingPaid({
          bookingId,
          userId,
          amount: intent.amount / 100,
          stripeId: intent.id,
          last4,
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).json({
      message: err instanceof Error ? err.message : 'Webhook error',
    });
  }
}

export default router;
