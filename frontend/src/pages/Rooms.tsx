
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchRooms,
  setRoomFilters,
} from '../store/roomsSlice';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import RoomGallery from '../components/RoomGallery';
import { formatZAR } from '../utils/money';
import type { RoomSearchFilters } from '../types';

export default function Rooms() {
  const dispatch = useAppDispatch();

  const { list, status, error, filters } = useAppSelector(
    (s) => s.rooms
  );

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
    dispatch(fetchRooms(filters));
  }, [dispatch, filters]);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    dispatch(setRoomFilters(form));
  }

  function onClear() {
    const empty: RoomSearchFilters = {
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

      {/* Page heading */}
      <div className="page-intro">
        <h1>Rooms</h1>

        <p className="muted">
          Browse our beautiful rooms and find your perfect stay.
        </p>

        {!token && (
          <p className="hint">
            You need to{' '}
            <Link to="/login">log in</Link>
            {' '}before booking or saving favorites.
          </p>
        )}
      </div>

      {/* Search form */}
      <form className="search-panel" onSubmit={onSearch}>
        <label>
          Location / keyword

          <input
            type="text"
            value={form.q}
            onChange={(e) =>
              setForm({
                ...form,
                q: e.target.value,
              })
            }
            placeholder="Search location or room type..."
          />
        </label>

        <div className="search-actions">
          <button
            className="btn btn-primary"
            type="submit"
          >
            Search
          </button>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Loading and error messages */}
      {status === 'loading' && (
        <p className="muted">Loading rooms...</p>
      )}

      {error && (
        <p className="error">{error}</p>
      )}

      {!list.length && status === 'succeeded' && (
        <p className="muted">
          No rooms match your search.
        </p>
      )}

      {/* Room cards */}
      <div className="room-grid room-grid-wide">
        {list.map((room) => {
          const images: string[] = room.images?.length
            ? room.images
            : room.image_url
              ? [room.image_url]
              : [];

          return (
            <article
              key={room.id}
              className="room-card"
            >

              {/* Room image */}
              <div className="room-image">
                <RoomGallery
                  name={room.name}
                  images={images}
                />

                <span
                  className={`room-status ${
                    room.available
                      ? 'available'
                      : 'unavailable'
                  }`}
                >
                  {room.available
                    ? 'Available'
                    : 'Unavailable'}
                </span>
              </div>

              {/* Room information */}
              <div className="room-body">
                <h2>{room.name}</h2>

                <p className="room-location">
                  {room.address}
                </p>

                <div className="room-info">
                  <span>
                    ★ {room.star_rating ?? 4} Stars
                  </span>

                  <span>
                    Sleeps {room.capacity}
                  </span>

                  <span>
                    {room.room_type}
                  </span>
                </div>

                {/* Price and View More */}
                <div className="room-footer">
                  <p className="price">
                    {formatZAR(
                      room.price_per_night,
                      0
                    )}

                    <span>/night</span>
                  </p>

                  <Link
                    to={`/rooms/${room.id}`}
                    className="btn btn-primary"
                  >
                    View More
                  </Link>
                </div>
              </div>

            </article>
          );
        })}
      </div>

    </section>
  );
}
