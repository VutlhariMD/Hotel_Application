import { Router, type Request, type Response } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import type { HotelSettings } from '../types.js';

const router = Router();

router.get('/location', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<HotelSettings>('SELECT * FROM hotel_settings WHERE id = 1');
    if (!result.rows[0]) {
      res.status(404).json({ message: 'Hotel location not set' });
      return;
    }
    const hotel = result.rows[0];
    res.json({
      hotel: {
        ...hotel,
        latitude: Number(hotel.latitude),
        longitude: Number(hotel.longitude),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load hotel location' });
  }
});

router.put('/location', requireAdmin as never, async (req: Request, res: Response) => {
  const { name, address, latitude, longitude } = req.body as Partial<HotelSettings>;
  if (!name?.trim() || !address?.trim() || latitude == null || longitude == null) {
    res.status(400).json({ message: 'Name, address, latitude, and longitude are required' });
    return;
  }

  try {
    const result = await pool.query<HotelSettings>(
      `INSERT INTO hotel_settings (id, name, address, latitude, longitude)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, address = EXCLUDED.address,
           latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
       RETURNING *`,
      [name.trim(), address.trim(), Number(latitude), Number(longitude)]
    );
    const hotel = result.rows[0];
    res.json({
      hotel: {
        ...hotel,
        latitude: Number(hotel.latitude),
        longitude: Number(hotel.longitude),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update hotel location' });
  }
});

export default router;
