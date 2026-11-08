import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Room } from '../types.js';
import { ROOM_FIELDS, attachImages } from '../utils/rooms.js';

const router = Router();

router.use(requireAuth as never);

router.get('/', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Room>(
      `SELECT ${ROOM_FIELDS}
       FROM favorites f
       JOIN rooms r ON r.id = f.room_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [authed.user.id]
    );
    const favorites = (await attachImages(result.rows)).map((room) => ({
      ...room,
      is_favorite: true,
    }));
    res.json({ favorites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load favorites' });
  }
});

router.post('/:roomId', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const roomId = Number(req.params.roomId);
  if (!roomId) {
    res.status(400).json({ message: 'Invalid room' });
    return;
  }

  try {
    const room = await pool.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (!room.rows[0]) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    await pool.query(
      `INSERT INTO favorites (user_id, room_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [authed.user.id, roomId]
    );
    res.status(201).json({ message: 'Added to favorites', roomId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

router.delete('/:roomId', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const roomId = Number(req.params.roomId);
  try {
    await pool.query('DELETE FROM favorites WHERE user_id = $1 AND room_id = $2', [
      authed.user.id,
      roomId,
    ]);
    res.json({ message: 'Removed from favorites', roomId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

export default router;
