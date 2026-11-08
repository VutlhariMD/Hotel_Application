import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Booking, Room } from '../types.js';
import { createNotification } from '../utils/notifications.js';

const router = Router();

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

async function hasOverlap(
  roomId: number,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number
): Promise<boolean> {
  const params: unknown[] = [roomId, checkIn, checkOut];
  let sql = `SELECT id FROM bookings
             WHERE room_id = $1
               AND status NOT IN ('cancelled')
               AND check_in < $3
               AND check_out > $2`;
  if (excludeBookingId) {
    params.push(excludeBookingId);
    sql += ` AND id <> $${params.length}`;
  }
  sql += ' LIMIT 1';
  const result = await pool.query(sql, params);
  return result.rows.length > 0;
}

router.get('/admin/all', requireAdmin as never, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<Booking>(
      `SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests, b.rooms_count,
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
  const { checkIn, checkOut, guests, roomsCount, status } = req.body as {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomsCount?: number;
    status?: string;
  };

  const allowed = ['pending', 'paid', 'cancelled', 'approved'];
  if (status && !allowed.includes(status)) {
    res.status(400).json({ message: 'Invalid status' });
    return;
  }

  try {
    const existing = await pool.query<Booking>(
      `SELECT b.*, r.price_per_night, r.capacity, r.name AS room_name
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
    const nextRooms = roomsCount != null ? Number(roomsCount) : Number(booking.rooms_count || 1);
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
    if (nextRooms < 1) {
      res.status(400).json({ message: 'At least 1 room required' });
      return;
    }
    if (booking.capacity && nextGuests > booking.capacity * nextRooms) {
      res.status(400).json({
        message: `Selected rooms sleep up to ${booking.capacity * nextRooms} guests`,
      });
      return;
    }

    if (await hasOverlap(booking.room_id, nextCheckIn, nextCheckOut, booking.id)) {
      res.status(409).json({ message: 'Room is already booked for those dates' });
      return;
    }

    const total = Number(booking.price_per_night) * nights * nextRooms;
    const result = await pool.query<Booking>(
      `UPDATE bookings
       SET check_in = $1, check_out = $2, guests = $3, rooms_count = $4, total_price = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [nextCheckIn, nextCheckOut, nextGuests, nextRooms, total, nextStatus, req.params.id]
    );

    if (nextStatus !== booking.status) {
      await createNotification(
        booking.user_id,
        'Booking updated',
        `Your reservation for ${booking.room_name} is now ${nextStatus}.`,
        'booking'
      );
    }

    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update reservation' });
  }
});

router.delete('/admin/:id', requireAdmin as never, async (req: Request, res: Response) => {
  try {
    const existing = await pool.query<Booking>(
      `SELECT b.*, r.name AS room_name FROM bookings b
       JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = existing.rows[0];
    if (!booking) {
      res.status(404).json({ message: 'Reservation not found' });
      return;
    }

    await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
    await createNotification(
      booking.user_id,
      'Booking cancelled',
      `Your reservation for ${booking.room_name} was cancelled by the hotel.`,
      'booking'
    );
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
      `SELECT b.id, b.check_in, b.check_out, b.guests, b.rooms_count, b.total_price, b.status, b.created_at,
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
      `SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests, b.rooms_count,
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
  const { roomId, checkIn, checkOut, guests, roomsCount } = req.body as {
    roomId?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomsCount?: number;
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
  const roomUnits = Number(roomsCount) || 1;
  if (guestCount < 1) {
    res.status(400).json({ message: 'At least 1 guest required' });
    return;
  }
  if (roomUnits < 1) {
    res.status(400).json({ message: 'At least 1 room required' });
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
    if (guestCount > room.capacity * roomUnits) {
      res.status(400).json({
        message: `Selected rooms sleep up to ${room.capacity * roomUnits} guests`,
      });
      return;
    }

    if (await hasOverlap(roomId, checkIn, checkOut)) {
      res.status(409).json({ message: 'Room is already booked for those dates' });
      return;
    }

    const total = Number(room.price_per_night) * nights * roomUnits;
    const result = await pool.query<Booking>(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, rooms_count, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [authed.user.id, roomId, checkIn, checkOut, guestCount, roomUnits, total]
    );

    await createNotification(
      authed.user.id,
      'Booking created',
      `Your booking for ${room.name} is pending payment (${checkIn} → ${checkOut}).`,
      'booking'
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

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const existing = await pool.query<Booking>(
      `SELECT b.*, r.name AS room_name FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [req.params.id, authed.user.id]
    );
    const booking = existing.rows[0];
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (booking.status === 'cancelled') {
      res.status(400).json({ message: 'Booking already cancelled' });
      return;
    }

    const result = await pool.query<Booking>(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [booking.id]
    );

    await createNotification(
      authed.user.id,
      'Booking cancelled',
      `You cancelled your stay at ${booking.room_name}.`,
      'booking'
    );

    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

export default router;
