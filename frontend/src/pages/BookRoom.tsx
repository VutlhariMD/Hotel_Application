import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchRoom, setRoomFavorite } from '../store/roomsSlice';
import { addFavorite, removeFavorite } from '../store/favoritesSlice';
import { createBooking, clearBookingError } from '../store/bookingsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import RoomGallery from '../components/RoomGallery';
import HotelMap from '../components/HotelMap';
import { formatZAR } from '../utils/money';
import { whatsappShareUrl } from '../utils/share';

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function BookRoom() {
  const { roomId = '' } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const room = useAppSelector((s) => s.rooms.current);
  const { status, error } = useAppSelector((s) => s.bookings);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    checkIn: today,
    checkOut: addDays(today, 2),
    guests: 1,
  });

  useEffect(() => {
    dispatch(clearBookingError());
    dispatch(fetchRoom(roomId));
  }, [dispatch, roomId]);

  const nights = useMemo(() => {
    const a = new Date(form.checkIn);
    const b = new Date(form.checkOut);
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  }, [form.checkIn, form.checkOut]);

  const total = room ? Number(room.price_per_night) * nights : 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await dispatch(
      createBooking({
        roomId: Number(roomId),
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
      })
    );
    if (createBooking.fulfilled.match(result)) {
      navigate(`/pay/${result.payload.id}`);
    }
  }

  if (!room) {
    return <p className="pad">Loading room…</p>;
  }

  const photos = room.images?.length ? room.images : [room.image_url];

  return (
    <section className="book-page">
      <div className="book-layout">
        <div className="book-media">
          <RoomGallery name={room.name} images={photos} className="book-gallery" />
          <HotelMap
            location={{
              name: room.name,
              address: room.address,
              latitude: Number(room.latitude),
              longitude: Number(room.longitude),
            }}
            height={260}
          />
        </div>

        <form className="book-form" onSubmit={onSubmit}>
          <h1>Book {room.name}</h1>
          <p className="muted">{room.description}</p>
          <p className="meta">
            {formatZAR(room.price_per_night, 0)}/night · sleeps {room.capacity} · {room.room_type}
          </p>
          <p className="meta room-address">{room.address}</p>

          <div className="room-actions">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${room.is_favorite ? 'is-fav' : ''}`}
              onClick={async () => {
                if (room.is_favorite) {
                  await dispatch(removeFavorite(room.id));
                  dispatch(setRoomFavorite({ roomId: room.id, isFavorite: false }));
                } else {
                  await dispatch(addFavorite(room.id));
                  dispatch(setRoomFavorite({ roomId: room.id, isFavorite: true }));
                }
              }}
            >
              {room.is_favorite ? '★ Favorited' : '☆ Favorite'}
            </button>
            <a
              className="btn btn-ghost btn-sm"
              href={whatsappShareUrl(room)}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
          </div>

          <label>
            Check-in
            <input
              type="date"
              min={today}
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              required
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              min={addDays(form.checkIn, 1)}
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              required
            />
          </label>
          <label>
            Guests
            <input
              type="number"
              min={1}
              max={room.capacity}
              value={form.guests}
              onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
              required
            />
          </label>

          <div className="total-box">
            <span>
              {nights} night{nights === 1 ? '' : 's'}
            </span>
            <strong>{formatZAR(total)}</strong>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={status === 'loading' || nights < 1}>
            {status === 'loading' ? 'Creating booking…' : 'Continue to payment'}
          </button>
        </form>
      </div>
    </section>
  );
}
