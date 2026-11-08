import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Booking } from '../types.js';
import { createNotification } from '../utils/notifications.js';

const router = Router();

type ChargeResult =
  | { ok: true; stripeId: string; last4: string; amount: number }
  | { ok: false; message: string };

/**
 * Stripe-compatible test payment gateway (no live Stripe keys required).
 * Accepts Stripe test card 4242 4242 4242 4242; declines 4000 0000 0000 0002.
 */
function stripeTestCharge(amount: number, cardNumber: string): ChargeResult {
  const digits = String(cardNumber || '').replace(/\s/g, '');

  if (!/^\d{16}$/.test(digits)) {
    return { ok: false, message: 'Card number must be 16 digits' };
  }
  if (digits === '4000000000000002') {
    return { ok: false, message: 'Card declined (Stripe test decline card)' };
  }
  if (digits !== '4242424242424242') {
    return { ok: false, message: 'Use test card 4242 4242 4242 4242' };
  }

  return {
    ok: true,
    stripeId: `pi_test_${Date.now()}`,
    last4: digits.slice(-4),
    amount,
  };
}

router.post('/pay', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { bookingId, cardNumber, expiry, cvc } = req.body as {
    bookingId?: number;
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
  };

  if (!bookingId || !cardNumber || !expiry || !cvc) {
    res.status(400).json({ message: 'Booking and card details are required' });
    return;
  }

  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    res.status(400).json({ message: 'Expiry must be MM/YY' });
    return;
  }
  if (!/^\d{3,4}$/.test(String(cvc))) {
    res.status(400).json({ message: 'Invalid CVC' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query<Booking>(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [bookingId, authed.user.id]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (booking.status === 'paid') {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Booking already paid' });
      return;
    }

    const charge = stripeTestCharge(Number(booking.total_price), cardNumber);
    if (!charge.ok) {
      await client.query('ROLLBACK');
      res.status(402).json({ message: charge.message });
      return;
    }

    const roomName = await client.query<{ name: string }>(
      'SELECT name FROM rooms WHERE id = $1',
      [booking.room_id]
    );

    await client.query(
      `INSERT INTO payments (booking_id, amount, card_last4, stripe_id, status)
       VALUES ($1, $2, $3, $4, 'succeeded')`,
      [booking.id, charge.amount, charge.last4, charge.stripeId]
    );
    await client.query(`UPDATE bookings SET status = 'paid' WHERE id = $1`, [booking.id]);
    await client.query('COMMIT');

    await createNotification(
      authed.user.id,
      'Payment confirmed',
      `Payment for ${roomName.rows[0]?.name || 'your stay'} succeeded. Booking #${booking.id} is confirmed.`,
      'payment'
    );

    res.json({
      message: 'Payment successful',
      payment: {
        stripeId: charge.stripeId,
        amount: charge.amount,
        last4: charge.last4,
        status: 'succeeded',
      },
      bookingId: booking.id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Payment failed' });
  } finally {
    client.release();
  }
});

export default router;
