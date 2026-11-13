
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

import '../BookRoom.css';

// Add days to a date without timezone-related shifts
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function BookRoom() {
  const { roomId = '' } = useParams<{ roomId: string }>();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const room = useAppSelector((s) => s.rooms.current);
  const { status, error } = useAppSelector((s) => s.bookings);

  const today = useMemo(() => getToday(), []);

  const [form, setForm] = useState({
    checkIn: today,
    checkOut: addDays(today, 2),
    guests: 1,
    roomsCount: 1,
  });

  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Fetch room details
  useEffect(() => {
    dispatch(clearBookingError());

    if (roomId) {
      dispatch(fetchRoom(roomId));
    }
  }, [dispatch, roomId]);

  // Calculate number of nights
  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;

    const start = Date.parse(`${form.checkIn}T00:00:00Z`);
    const end = Date.parse(`${form.checkOut}T00:00:00Z`);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return 0;
    }

    return Math.max(0, Math.round((end - start) / 86400000));
  }, [form.checkIn, form.checkOut]);

  const pricePerNight = Number(room?.price_per_night ?? 0);

  const subtotal = pricePerNight * nights;

  const total = subtotal * form.roomsCount;

  const maxGuests = room
    ? Number(room.capacity) * form.roomsCount
    : 1;

  const validBooking =
    Boolean(room?.available) &&
    Boolean(roomId) &&
    Number(roomId) > 0 &&
    form.checkIn >= today &&
    nights >= 1 &&
    form.roomsCount >= 1 &&
    form.roomsCount <= 5 &&
    Number.isInteger(form.roomsCount) &&
    form.guests >= 1 &&
    Number.isInteger(form.guests) &&
    form.guests <= maxGuests;

  // Handle booking
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validBooking) return;

    const result = await dispatch(
      createBooking({
        roomId: Number(roomId),
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: form.guests,
        roomsCount: form.roomsCount,
      })
    );

    if (createBooking.fulfilled.match(result)) {
      navigate(`/pay/${result.payload.id}`);
    }
  }

  // Handle favorites
  async function toggleFavorite() {
    if (!room || favoriteLoading) return;

    setFavoriteLoading(true);

    try {
      if (room.is_favorite) {
        await dispatch(removeFavorite(room.id)).unwrap();

        dispatch(
          setRoomFavorite({
            roomId: room.id,
            isFavorite: false,
          })
        );
      } else {
        await dispatch(addFavorite(room.id)).unwrap();

        dispatch(
          setRoomFavorite({
            roomId: room.id,
            isFavorite: true,
          })
        );
      }
    } catch (err) {
      console.error('Failed to update favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  }

  if (!roomId || !Number.isInteger(Number(roomId)) || Number(roomId) <= 0) {
    return <p className="pad error">Invalid room ID.</p>;
  }

  if (!room || String(room.id) !== roomId) {
    return <p className="pad">Loading room details...</p>;
  }

  const photos: string[] = room.images?.length
    ? room.images
    : room.image_url
      ? [room.image_url]
      : [];

  return (
    <section className="book-page">

      {/* PAGE HEADER */}
      <div className="booking-heading">
        <span className="booking-eyebrow">
          SERENESTAY / RESERVATIONS
        </span>

        <h1>Complete your reservation</h1>

        <p>
          Choose your dates and confirm your stay.
        </p>
      </div>

      <div className="book-layout">

        {/* LEFT SIDE - ROOM DETAILS */}
        <div className="book-media">

          <div className="booking-room-card">

            <RoomGallery
              name={room.name}
              images={photos}
              className="book-gallery"
            />

            <div className="booking-room-info">

              <h2>{room.name}</h2>

              <p className="booking-address">
                {room.address}
              </p>

              <div className="booking-room-meta">
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

              <p className="booking-description">
                {room.description}
              </p>

              {/* FACILITIES */}
              {!!room.facilities?.length && (
                <div className="booking-facilities">

                  <h3>Room amenities</h3>

                  <div className="facility-list">
                    {room.facilities.map((item) => (
                      <span
                        className="facility-chip"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* POLICIES */}
              {room.policies && (
                <div className="booking-policies">
                  <h3>Hotel policies</h3>
                  <p>{room.policies}</p>
                </div>
              )}

              {/* MAP */}
              <div className="booking-map">

                <h3>Location</h3>

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

              {/* ROOM ACTIONS */}
              <div className="room-actions">

                <button
                  type="button"
                  className={`btn btn-ghost btn-sm ${
                    room.is_favorite ? 'is-fav' : ''
                  }`}
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                >
                  {favoriteLoading
                    ? 'Updating...'
                    : room.is_favorite
                      ? '★ Favorited'
                      : '☆ Favorite'}
                </button>

                <a
                  className="btn btn-ghost btn-sm"
                  href={whatsappShareUrl(room)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share on WhatsApp
                </a>

              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - BOOKING FORM */}
        <form
          className="book-form"
          onSubmit={onSubmit}
        >

          <div className="booking-form-header">

            <h2>Your reservation</h2>

            <p>
              {formatZAR(pricePerNight, 0)}
              <span> / night</span>
            </p>

          </div>

          <div className="booking-fields">

            {/* CHECK-IN */}
            <div className="booking-field">

              <label htmlFor="checkIn">
                Check-in
              </label>

              <input
                id="checkIn"
                type="date"
                min={today}
                value={form.checkIn}
                onChange={(e) => {
                  const checkIn = e.target.value;

                  if (!checkIn) return;

                  setForm((prev) => ({
                    ...prev,
                    checkIn,
                    checkOut:
                      prev.checkOut <= checkIn
                        ? addDays(checkIn, 1)
                        : prev.checkOut,
                  }));
                }}
                required
              />
            </div>

            {/* CHECK-OUT */}
            <div className="booking-field">

              <label htmlFor="checkOut">
                Check-out
              </label>

              <input
                id="checkOut"
                type="date"
                min={addDays(form.checkIn, 1)}
                value={form.checkOut}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    checkOut: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="booking-field-row">

              {/* NUMBER OF ROOMS */}
              <div className="booking-field">

                <label htmlFor="roomsCount">
                  Number of rooms
                </label>

                <input
                  id="roomsCount"
                  type="number"
                  min={1}
                  max={5}
                  value={form.roomsCount}
                  onChange={(e) => {
                    const roomsCount = Number(e.target.value);

                    setForm((prev) => ({
                      ...prev,
                      roomsCount,
                      guests: Math.min(
                        prev.guests,
                        Number(room.capacity) * roomsCount
                      ),
                    }));
                  }}
                  required
                />
              </div>

              {/* GUESTS */}
              <div className="booking-field">

                <label htmlFor="guests">
                  Guests
                </label>

                <input
                  id="guests"
                  type="number"
                  min={1}
                  max={maxGuests}
                  value={form.guests}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      guests: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* PRICE SUMMARY */}
          <div className="booking-summary">

            <h3>Price summary</h3>

            <div className="summary-line">
              <span>
                {formatZAR(pricePerNight, 0)}
                {' × '}
                {nights} night
                {nights === 1 ? '' : 's'}
              </span>

              <span>
                {formatZAR(subtotal)}
              </span>
            </div>

            <div className="summary-line">
              <span>Number of rooms</span>
              <span>{form.roomsCount}</span>
            </div>

            <div className="total-box">
              <span>Total amount</span>
              <strong>
                {formatZAR(total)}
              </strong>
            </div>

          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {/* PAYMENT BUTTON */}
          <button
            className="btn btn-primary booking-submit"
            type="submit"
            disabled={
              status === 'loading' || !validBooking
            }
          >
            {status === 'loading'
              ? 'Creating booking...'
              : !room.available
                ? 'Room unavailable'
                : 'Continue to payment'}
          </button>

          <p className="booking-secure">
            Secure reservation process
          </p>

        </form>
      </div>
    </section>
  );
}
