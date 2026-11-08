import pool from '../db/pool.js';

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type = 'info'
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  );
}
