import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Review } from '../types.js';
import { createNotification } from '../utils/notifications.js';

const router = Router();

router.get('/room/:roomId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query<Review>(
      `SELECT r.id, r.user_id, r.room_id, r.rating, r.comment, r.created_at,
              u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.room_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.roomId]
    );
    const avg = result.rows.length
      ? result.rows.reduce((sum, row) => sum + Number(row.rating), 0) / result.rows.length
      : null;
    res.json({ reviews: result.rows, avg_rating: avg, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reviews' });
  }
});

router.post('/', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { roomId, rating, comment } = req.body as {
    roomId?: number;
    rating?: number;
    comment?: string;
  };

  if (!roomId || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ message: 'Room and a rating from 1–5 are required' });
    return;
  }

  try {
    const room = await pool.query<{ id: number; name: string }>(
      'SELECT id, name FROM rooms WHERE id = $1',
      [roomId]
    );
    if (!room.rows[0]) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const stayed = await pool.query(
      `SELECT id FROM bookings
       WHERE user_id = $1 AND room_id = $2 AND status IN ('paid', 'approved')
       LIMIT 1`,
      [authed.user.id, roomId]
    );
    if (!stayed.rows[0]) {
      res.status(403).json({ message: 'You can only review rooms you have booked' });
      return;
    }

    const result = await pool.query<Review>(
      `INSERT INTO reviews (user_id, room_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, room_id) DO UPDATE
       SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [authed.user.id, roomId, Number(rating), String(comment || '').trim()]
    );

    await createNotification(
      authed.user.id,
      'Review saved',
      `Thanks for rating ${room.rows[0].name}.`,
      'review'
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save review' });
  }
});

export default router;
