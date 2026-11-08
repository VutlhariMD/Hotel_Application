import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthedRequest, Room } from '../types.js';
import {
  ROOM_FIELDS,
  attachImages,
  normalizeFacilities,
  normalizeImageList,
  replaceRoomImages,
  serializeRoom,
} from '../utils/rooms.js';

const router = Router();

async function attachRatings(rooms: Room[]): Promise<Room[]> {
  if (!rooms.length) return rooms;
  const ids = rooms.map((r) => r.id);
  const result = await pool.query<{ room_id: number; avg_rating: string; review_count: string }>(
    `SELECT room_id,
            ROUND(AVG(rating)::numeric, 1) AS avg_rating,
            COUNT(*)::text AS review_count
     FROM reviews
     WHERE room_id = ANY($1::int[])
     GROUP BY room_id`,
    [ids]
  );
  const map = new Map(result.rows.map((row) => [row.room_id, row]));
  return rooms.map((room) => {
    const stats = map.get(room.id);
    return {
      ...room,
      avg_rating: stats ? Number(stats.avg_rating) : null,
      review_count: stats ? Number(stats.review_count) : 0,
    };
  });
}

router.get('/', optionalAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { type, available, q, location, minPrice, maxPrice, capacity, minRating } = req.query;
  const params: unknown[] = [];
  const where: string[] = [];

  if (typeof type === 'string' && type.trim()) {
    params.push(type.trim().toLowerCase());
    where.push(`LOWER(room_type) = $${params.length}`);
  }
  if (available === 'true') {
    where.push('available = TRUE');
  }
  if (available === 'false') {
    where.push('available = FALSE');
  }

  const search = typeof q === 'string' ? q : typeof location === 'string' ? location : '';
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where.push(
      `(LOWER(name) LIKE $${params.length} OR LOWER(address) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(room_type) LIKE $${params.length})`
    );
  }

  if (minPrice != null && String(minPrice).trim() !== '' && !Number.isNaN(Number(minPrice))) {
    params.push(Number(minPrice));
    where.push(`price_per_night >= $${params.length}`);
  }
  if (maxPrice != null && String(maxPrice).trim() !== '' && !Number.isNaN(Number(maxPrice))) {
    params.push(Number(maxPrice));
    where.push(`price_per_night <= $${params.length}`);
  }
  if (capacity != null && String(capacity).trim() !== '' && !Number.isNaN(Number(capacity))) {
    params.push(Number(capacity));
    where.push(`capacity >= $${params.length}`);
  }
  if (minRating != null && String(minRating).trim() !== '' && !Number.isNaN(Number(minRating))) {
    params.push(Number(minRating));
    where.push(`star_rating >= $${params.length}`);
  }

  try {
    let sql = `SELECT ${ROOM_FIELDS} FROM rooms`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY price_per_night';

    const result = await pool.query<Room>(sql, params);
    let rooms = await attachImages(result.rows);
    rooms = await attachRatings(rooms);

    if (authed.user?.id) {
      const favs = await pool.query<{ room_id: number }>(
        'SELECT room_id FROM favorites WHERE user_id = $1',
        [authed.user.id]
      );
      const favSet = new Set(favs.rows.map((f) => f.room_id));
      rooms = rooms.map((r) => ({ ...r, is_favorite: favSet.has(r.id) }));
    }

    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load rooms' });
  }
});

router.get('/types/list', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<{ room_type: string }>(
      `SELECT DISTINCT room_type FROM rooms ORDER BY room_type`
    );
    res.json({ types: result.rows.map((r) => r.room_type) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load room types' });
  }
});

router.get('/:id', optionalAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<Room>(
      `SELECT ${ROOM_FIELDS} FROM rooms WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    let [room] = await attachImages(result.rows);
    [room] = await attachRatings([room]);
    if (authed.user?.id) {
      const fav = await pool.query(
        'SELECT 1 FROM favorites WHERE user_id = $1 AND room_id = $2',
        [authed.user.id, room.id]
      );
      room.is_favorite = fav.rows.length > 0;
    }

    res.json({ room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load room' });
  }
});

router.post('/', requireAdmin as never, async (req: Request, res: Response) => {
  const {
    name,
    description,
    price_per_night,
    capacity,
    room_type,
    available,
    address,
    latitude,
    longitude,
    star_rating,
    policies,
  } = req.body as Partial<Room> & { images?: string[] };

  const images = normalizeImageList(req.body as { images?: string[]; image_url?: string });
  const facilities = normalizeFacilities(
    (req.body as { facilities?: unknown }).facilities
  );

  if (!name?.trim() || !description?.trim()) {
    res.status(400).json({ message: 'Name and description are required' });
    return;
  }
  if (!images.length) {
    res.status(400).json({ message: 'At least one image URL is required' });
    return;
  }
  if (!address?.trim()) {
    res.status(400).json({ message: 'Address is required' });
    return;
  }
  if (latitude == null || longitude == null || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
    res.status(400).json({ message: 'Latitude and longitude are required' });
    return;
  }
  if (price_per_night == null || Number(price_per_night) <= 0) {
    res.status(400).json({ message: 'Price must be greater than 0' });
    return;
  }
  if (!capacity || Number(capacity) < 1) {
    res.status(400).json({ message: 'Capacity must be at least 1' });
    return;
  }

  const stars = Math.min(5, Math.max(1, Number(star_rating) || 4));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Room>(
      `INSERT INTO rooms
        (name, description, price_per_night, capacity, room_type, available, image_url, address, latitude, longitude, star_rating, facilities, policies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${ROOM_FIELDS}`,
      [
        name.trim(),
        description.trim(),
        Number(price_per_night),
        Number(capacity),
        (room_type || 'standard').trim().toLowerCase(),
        available !== false,
        images[0],
        address.trim(),
        Number(latitude),
        Number(longitude),
        stars,
        facilities,
        String(policies || '').trim(),
      ]
    );
    const room = result.rows[0];
    for (let i = 0; i < images.length; i += 1) {
      await client.query(
        `INSERT INTO room_images (room_id, url, sort_order) VALUES ($1, $2, $3)`,
        [room.id, images[i], i]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ room: serializeRoom(room, images) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Failed to create room' });
  } finally {
    client.release();
  }
});

router.put('/:id', requireAdmin as never, async (req: Request, res: Response) => {
  const {
    name,
    description,
    price_per_night,
    capacity,
    room_type,
    available,
    address,
    latitude,
    longitude,
    star_rating,
    policies,
  } = req.body as Partial<Room> & { images?: string[] };

  const images = normalizeImageList(req.body as { images?: string[]; image_url?: string });
  const facilities = normalizeFacilities(
    (req.body as { facilities?: unknown }).facilities
  );

  if (!name?.trim() || !description?.trim()) {
    res.status(400).json({ message: 'Name and description are required' });
    return;
  }
  if (!images.length) {
    res.status(400).json({ message: 'At least one image URL is required' });
    return;
  }
  if (!address?.trim()) {
    res.status(400).json({ message: 'Address is required' });
    return;
  }
  if (latitude == null || longitude == null || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
    res.status(400).json({ message: 'Latitude and longitude are required' });
    return;
  }

  const stars = Math.min(5, Math.max(1, Number(star_rating) || 4));

  try {
    const result = await pool.query<Room>(
      `UPDATE rooms
       SET name = $1, description = $2, price_per_night = $3, capacity = $4,
           room_type = $5, available = $6, image_url = $7, address = $8,
           latitude = $9, longitude = $10, star_rating = $11, facilities = $12, policies = $13
       WHERE id = $14
       RETURNING ${ROOM_FIELDS}`,
      [
        name.trim(),
        description.trim(),
        Number(price_per_night),
        Number(capacity),
        (room_type || 'standard').trim().toLowerCase(),
        available !== false,
        images[0],
        address.trim(),
        Number(latitude),
        Number(longitude),
        stars,
        facilities,
        String(policies || '').trim(),
        req.params.id,
      ]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    await replaceRoomImages(Number(req.params.id), images);
    res.json({ room: serializeRoom(result.rows[0], images) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update room' });
  }
});

router.delete('/:id', requireAdmin as never, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }
    res.json({ message: 'Room deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete room' });
  }
});

export default router;
