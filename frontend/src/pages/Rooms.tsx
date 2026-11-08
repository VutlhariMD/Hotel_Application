import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchRooms, fetchRoomTypes, setRoomFavorite, setRoomFilters } from '../store/roomsSlice';
import { addFavorite, removeFavorite } from '../store/favoritesSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import RoomGallery from '../components/RoomGallery';
import HotelMap from '../components/HotelMap';
import RoomReviews from '../components/RoomReviews';
import { formatZAR } from '../utils/money';
import { whatsappShareUrl } from '../utils/share';
import type { RoomSearchFilters } from '../types';

export default function Rooms() {
  const dispatch = useAppDispatch();
  const { list, status, error, types, filters } = useAppSelector((s) => s.rooms);
  const token = useAppSelector((s) => s.auth.token);
  const [form, setForm] = useState<RoomSearchFilters>({
    q: filters.q || '',
    type: filters.type || '',
    available: filters.available || '',
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    capacity: filters.capacity || '',
    minRating: filters.minRating || '',
  });

  useEffect(() => {
    dispatch(fetchRoomTypes());
    dispatch(fetchRooms(filters));
  }, [dispatch, filters]);

  async function toggleFavorite(roomId: number, isFavorite?: boolean) {
    if (!token) return;
    if (isFavorite) {
      await dispatch(removeFavorite(roomId));
      dispatch(setRoomFavorite({ roomId, isFavorite: false }));
    } else {
      await dispatch(addFavorite(roomId));
      dispatch(setRoomFavorite({ roomId, isFavorite: true }));
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    dispatch(setRoomFilters(form));
  }

  function onClear() {
    const empty = {
      q: '',
      type: '',
      available: '',
      minPrice: '',
      maxPrice: '',
      capacity: '',
      minRating: '',
    };
    setForm(empty);
    dispatch(setRoomFilters(empty));
  }

  return (
    <section className="rooms-page">
      <div className="page-intro">
        <h1>Rooms</h1>
        <p className="muted">Browse photos, check each room’s map pin, then book your stay.</p>
        {!token && (
          <p className="hint">
            You need to <Link to="/login">log in</Link> before booking or saving favorites.
          </p>
        )}
      </div>

      <form className="search-panel" onSubmit={onSearch}>
        <label>
          Location / keyword
          <input
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
            placeholder="Polokwane, suite, balcony…"
          />
        </label>
        <label>
          Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">Any</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min price
          <input
            type="number"
            min={0}
            value={form.minPrice}
            onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
            placeholder="0"
          />
        </label>
        <label>
          Max price
          <input
            type="number"
            min={0}
            value={form.maxPrice}
            onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
            placeholder="5000"
          />
        </label>
        <label>
          Guests
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="1+"
          />
        </label>
        <label>
          Min stars
          <select
            value={form.minRating}
            onChange={(e) => setForm({ ...form, minRating: e.target.value })}
          >
            <option value="">Any</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
        <label>
          Availability
          <select
            value={form.available}
            onChange={(e) => setForm({ ...form, available: e.target.value })}
          >
            <option value="">Any</option>
            <option value="true">Available only</option>
          </select>
        </label>
        <div className="search-actions">
          <button className="btn btn-primary" type="submit">
            Search
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClear}>
            Clear
          </button>
        </div>
      </form>

      {status === 'loading' && <p>Loading rooms…</p>}
      {error && <p className="error">{error}</p>}
      {!list.length && status === 'succeeded' && (
        <p className="muted">No rooms match those filters.</p>
      )}

      <div className="room-grid room-grid-wide">
        {list.map((room) => (
          <article key={room.id} className="room-card room-card-rich">
            <RoomGallery name={room.name} images={room.images?.length ? room.images : [room.image_url]} />
            <div className="room-body">
              <div className="room-top">
                <h2>{room.name}</h2>
                <p className="price">
                  {formatZAR(room.price_per_night, 0)}
                  <span>/night</span>
                </p>
              </div>
              <p className="muted">{room.description}</p>
              <p className="meta">
                {'★'.repeat(room.star_rating || 4)}
                {'☆'.repeat(5 - (room.star_rating || 4))} · Sleeps {room.capacity} · {room.room_type}
                {!room.available && ' · Unavailable'}
                {room.avg_rating != null && ` · Guests ${room.avg_rating.toFixed(1)}/5`}
              </p>
              <p className="meta room-address">{room.address}</p>

              {!!room.facilities?.length && (
                <div className="facility-list">
                  {room.facilities.map((item) => (
                    <span key={item} className="facility-chip">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {room.policies && (
                <div className="policy-box">
                  <strong>Policies</strong>
                  <p className="muted">{room.policies}</p>
                </div>
              )}

              <HotelMap
                location={{
                  name: room.name,
                  address: room.address,
                  latitude: Number(room.latitude),
                  longitude: Number(room.longitude),
                }}
                height={220}
              />

              <div className="room-actions">
                {token && room.available ? (
                  <Link className="btn btn-primary" to={`/book/${room.id}`}>
                    Book now
                  </Link>
                ) : !token ? (
                  <Link className="btn btn-primary" to="/login" state={{ from: `/book/${room.id}` }}>
                    Log in to book
                  </Link>
                ) : (
                  <button className="btn btn-ghost" type="button" disabled>
                    Unavailable
                  </button>
                )}

                {token && (
                  <button
                    type="button"
                    className={`btn btn-ghost ${room.is_favorite ? 'is-fav' : ''}`}
                    onClick={() => toggleFavorite(room.id, room.is_favorite)}
                  >
                    {room.is_favorite ? '★ Favorited' : '☆ Favorite'}
                  </button>
                )}

                <a
                  className="btn btn-ghost"
                  href={whatsappShareUrl(room)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </a>
              </div>

              <RoomReviews roomId={room.id} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
