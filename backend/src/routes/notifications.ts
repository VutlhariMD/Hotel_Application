import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, Notification } from '../types.js';

const router = Router();

router.use(requireAuth as never);

router.get('/', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Notification>(
      `SELECT id, user_id, title, message, type, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [authed.user.id]
    );
    const unread = result.rows.filter((n) => !n.read).length;
    res.json({ notifications: result.rows, unread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Notification>(
      `UPDATE notifications SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, authed.user.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

router.post('/read-all', async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    await pool.query(`UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`, [
      authed.user.id,
    ]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

export default router;
