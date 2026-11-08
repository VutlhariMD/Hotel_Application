import pool from '../db/pool.js';
import type { Room } from '../types.js';

export const ROOM_FIELDS =
  'id, name, description, price_per_night, capacity, room_type, available, image_url, address, latitude, longitude';

export function normalizeImageList(input: {
  images?: unknown;
  image_url?: unknown;
}): string[] {
  const fromArray = Array.isArray(input.images)
    ? input.images
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];

  if (fromArray.length) return fromArray;

  const single = String(input.image_url || '').trim();
  return single ? [single] : [];
}

export function serializeRoom(room: Room, images: string[] = []): Room {
  const list = images.length ? images : room.image_url ? [room.image_url] : [];
  return {
    ...room,
    latitude: Number(room.latitude),
    longitude: Number(room.longitude),
    image_url: list[0] || room.image_url,
    images: list,
  };
}

export async function attachImages(rooms: Room[]): Promise<Room[]> {
  if (!rooms.length) return [];

  const ids = rooms.map((r) => r.id);
  const result = await pool.query<{ room_id: number; url: string }>(
    `SELECT room_id, url
     FROM room_images
     WHERE room_id = ANY($1::int[])
     ORDER BY sort_order ASC, id ASC`,
    [ids]
  );

  const byRoom = new Map<number, string[]>();
  for (const row of result.rows) {
    const list = byRoom.get(row.room_id) || [];
    list.push(row.url);
    byRoom.set(row.room_id, list);
  }

  return rooms.map((room) => serializeRoom(room, byRoom.get(room.id) || []));
}

export async function replaceRoomImages(roomId: number, images: string[]): Promise<void> {
  await pool.query('DELETE FROM room_images WHERE room_id = $1', [roomId]);
  for (let i = 0; i < images.length; i += 1) {
    await pool.query(
      `INSERT INTO room_images (room_id, url, sort_order) VALUES ($1, $2, $3)`,
      [roomId, images[i], i]
    );
  }
}
