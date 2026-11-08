import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Booking, Room } from '../types.js';

const router = Router();

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

router.get('/admin/all', requireAdmin as never, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<Booking>(
      `SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests,
              b.total_price, b.status, b.created_at,
              r.name AS room_name, r.image_url, r.price_per_night,
              u.name AS guest_name, u.email AS guest_email
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reservations' });
  }
});

router.patch('/admin/:id', requireAdmin as never, async (req: Request, res: Response) => {
  const { checkIn, checkOut, guests, status } = req.body as {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    status?: string;
  };

  const allowed = ['pending', 'paid', 'cancelled'];
  if (status && !allowed.includes(status)) {
    res.status(400).json({ message: 'Invalid status' });
    return;
  }

  try {
    const existing = await pool.query<Booking>(
      `SELECT b.*, r.price_per_night, r.capacity
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = existing.rows[0];
    if (!booking) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }

    const nextCheckIn = checkIn || String(booking.check_in).slice(0, 10);
    const nextCheckOut = checkOut || String(booking.check_out).slice(0, 10);
    const nextGuests = guests != null ? Number(guests) : booking.guests;
    const nextStatus = status || booking.status;

    const nights = nightsBetween(nextCheckIn, nextCheckOut);
    if (nights < 1) {
      res.status(400).json({ message: 'Check-out must be after check-in' });
      return;
    }
    if (nextGuests < 1) {
      res.status(400).json({ message: 'At least 1 guest required' });
      return;
    }
    if (booking.capacity && nextGuests > booking.capacity) {
      res.status(400).json({ message: `Room sleeps up to ${booking.capacity} guests` });
      return;
    }

    const total = Number(booking.price_per_night) * nights;
    const result = await pool.query<Booking>(
      `UPDATE bookings
       SET check_in = $1, check_out = $2, guests = $3, total_price = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [nextCheckIn, nextCheckOut, nextGuests, total, nextStatus, req.params.id]
    );

    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update reservation' });
  }
});

router.delete('/admin/:id', requireAdmin as never, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }
    res.json({ message: 'Reservation deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete reservation' });
  }
});

router.use(requireAuth as never);

router.get('/', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Booking>(
      `SELECT b.id, b.check_in, b.check_out, b.guests, b.total_price, b.status, b.created_at,
              r.name AS room_name, r.image_url, r.price_per_night
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [authed.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Booking>(
      `SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests,
              b.total_price, b.status, b.created_at,
              r.name AS room_name, r.image_url, r.price_per_night, r.capacity
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [req.params.id, authed.user.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load booking' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { roomId, checkIn, checkOut, guests } = req.body as {
    roomId?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  };

  if (!roomId || !checkIn || !checkOut) {
    res.status(400).json({ message: 'Room, check-in, and check-out are required' });
    return;
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    res.status(400).json({ message: 'Check-out must be after check-in' });
    return;
  }

  const guestCount = Number(guests) || 1;
  if (guestCount < 1) {
    res.status(400).json({ message: 'At least 1 guest required' });
    return;
  }

  try {
    const roomResult = await pool.query<Room>('SELECT * FROM rooms WHERE id = $1', [roomId]);
    const room = roomResult.rows[0];
    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }
    if (!room.available) {
      res.status(400).json({ message: 'This room is currently unavailable' });
      return;
    }
    if (guestCount > room.capacity) {
      res.status(400).json({ message: `This room sleeps up to ${room.capacity} guests` });
      return;
    }

    const total = Number(room.price_per_night) * nights;
    const result = await pool.query<Booking>(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [authed.user.id, roomId, checkIn, checkOut, guestCount, total]
    );

    res.status(201).json({
      booking: {
        ...result.rows[0],
        room_name: room.name,
        image_url: room.image_url,
        nights,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

export default router;
