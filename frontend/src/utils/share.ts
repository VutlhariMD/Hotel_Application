import { formatZAR } from './money';
import type { Room } from '../types';

export function whatsappShareUrl(room: Room, pageUrl?: string): string {
  const url = pageUrl || `${window.location.origin}/book/${room.id}`;
  const text = [
    `Check out ${room.name} at HHotel!`,
    `${formatZAR(room.price_per_night, 0)}/night · Sleeps ${room.capacity} · ${room.room_type}`,
    room.address ? `Location: ${room.address}` : '',
    room.description,
    url,
  ]
    .filter(Boolean)
    .join('\n\n');

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
