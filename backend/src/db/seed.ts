import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type RoomSeed = {
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  room_type: string;
  available: boolean;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
};

const rooms: RoomSeed[] = [
  {
    name: 'Cozy Single',
    description: 'Quiet room with a twin bed, desk, and city view. Ideal for solo travelers.',
    price_per_night: 890,
    capacity: 1,
    room_type: 'single',
    available: true,
    address: '12 Church Street, Polokwane, Limpopo, 0699',
    latitude: -23.9045,
    longitude: 29.4689,
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
      'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    ],
  },
  {
    name: 'Classic Double',
    description: 'Comfortable double bed, ensuite bathroom, and morning sunlight.',
    price_per_night: 1350,
    capacity: 2,
    room_type: 'double',
    available: true,
    address: '45 Landdros Mare Street, Polokwane, Limpopo, 0699',
    latitude: -23.9082,
    longitude: 29.4556,
    images: [
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    ],
  },
  {
    name: 'Family Suite',
    description: 'Spacious suite with two bedrooms, sofa, and a small kitchenette.',
    price_per_night: 2200,
    capacity: 4,
    room_type: 'suite',
    available: true,
    address: '8 Grobler Street, Polokwane, Limpopo, 0699',
    latitude: -23.9001,
    longitude: 29.4612,
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1631049552057-403cdb8f8755?w=800',
    ],
  },
  {
    name: 'Deluxe King',
    description: 'King bed, balcony, and premium amenities for a relaxing stay.',
    price_per_night: 1850,
    capacity: 2,
    room_type: 'deluxe',
    available: true,
    address: '3 Biccard Street, Polokwane, Limpopo, 0699',
    latitude: -23.9125,
    longitude: 29.4508,
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
    ],
  },
  {
    name: 'Penthouse',
    description: 'Top-floor penthouse with panoramic views and a private lounge.',
    price_per_night: 3500,
    capacity: 3,
    room_type: 'penthouse',
    available: true,
    address: '21 Hans van Rensburg Street, Polokwane, Limpopo, 0699',
    latitude: -23.8968,
    longitude: 29.4741,
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
  },
];

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    await client.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`).catch(() => undefined);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`).catch(() => undefined);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`).catch(() => undefined);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)`).catch(() => undefined);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`).catch(() => undefined);
    await client.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) NOT NULL DEFAULT 'standard'`).catch(() => undefined);
    await client.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT TRUE`).catch(() => undefined);
    await client.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`).catch(() => undefined);
    await client.query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) NOT NULL DEFAULT -23.9045000`
    ).catch(() => undefined);
    await client.query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NOT NULL DEFAULT 29.4689000`
    ).catch(() => undefined);

    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM favorites');
    await client.query('DELETE FROM room_images');
    await client.query('DELETE FROM rooms');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM hotel_settings');

    const password = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user')`,
      ['Demo Guest', 'guest@hhotel.com', password]
    );
    await client.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')`,
      ['Hotel Admin', 'admin@hhotel.com', password]
    );

    for (const room of rooms) {
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO rooms
          (name, description, price_per_night, capacity, room_type, available, image_url, address, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          room.name,
          room.description,
          room.price_per_night,
          room.capacity,
          room.room_type,
          room.available,
          room.images[0],
          room.address,
          room.latitude,
          room.longitude,
        ]
      );

      const roomId = inserted.rows[0].id;
      for (let i = 0; i < room.images.length; i += 1) {
        await client.query(
          `INSERT INTO room_images (room_id, url, sort_order) VALUES ($1, $2, $3)`,
          [roomId, room.images[i], i]
        );
      }
    }

    await client.query(
      `INSERT INTO hotel_settings (id, name, address, latitude, longitude)
       VALUES (1, $1, $2, $3, $4)`,
      [
        'HHotel Polokwane',
        '12 Church Street, Polokwane, Limpopo, 0699, South Africa',
        -23.9045,
        29.4689,
      ]
    );

    console.log('Database ready.');
    console.log('Guest login: guest@hhotel.com / password123');
    console.log('Admin login: admin@hhotel.com / password123');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Seed failed:', message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
