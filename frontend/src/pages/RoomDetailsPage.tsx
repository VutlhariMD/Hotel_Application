
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RoomGallery from '../components/RoomGallery';
import HotelMap from '../components/HotelMap';
import RoomReviews from '../components/RoomReviews';
import { formatZAR } from '../utils/money';
import { useAppSelector } from '../store/hooks';
import type { Room } from '../types';

export default function RoomDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAppSelector((s) => s.auth.token);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadRoom() {
      setLoading(true);
      setError('');

      try {
        const apiBase = (
          import.meta.env.VITE_BACKEND_URL || ''
        ).replace(/\/+$/, '');

        const response = await fetch(
          `${apiBase}/api/rooms/${id}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to load room details');
        }

        const data = await response.json();
        setRoom(data.room ?? data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoom();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <p>Loading room details...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!room) {
    return <p>Room not found.</p>;
  }

  return (
    <section className="room-details-page">
      <Link to="/rooms" className="back-link">
        ← Back to Rooms
      </Link>

      <div className="details-header">
        <div>
          <h1>{room.name}</h1>
          <p>{room.address}</p>
        </div>

        <div className="details-price">
          {formatZAR(room.price_per_night, 0)}
          <span>/night</span>
        </div>
      </div>

      <RoomGallery
        name={room.name}
        images={
          room.images?.length
            ? room.images
            : room.image_url
              ? [room.image_url]
              : []
        }
      />

      <div className="details-content">
        <main className="details-main">
          <div className="details-section">
            <h2>About this room</h2>
            <p>{room.description}</p>

            <div className="details-meta">
              <span>★ {room.star_rating ?? 4} Stars</span>
              <span>Sleeps {room.capacity}</span>
              <span>{room.room_type}</span>
            </div>
          </div>

          {!!room.facilities?.length && (
            <div className="details-section">
              <h2>Facilities & Amenities</h2>

              <div className="facility-list">
                {room.facilities.map((item) => (
                  <span key={item} className="facility-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {room.policies && (
            <div className="details-section">
              <h2>Hotel Policies</h2>
              <p>{room.policies}</p>
            </div>
          )}

          <div className="details-section">
            <h2>Location</h2>

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

          <div className="details-section">
            <h2>Guest Reviews</h2>
            <RoomReviews roomId={room.id} />
          </div>
        </main>

        <aside className="booking-card">
          <h2>Reserve your stay</h2>

          <p className="booking-price">
            {formatZAR(room.price_per_night, 0)}
            <span> /night</span>
          </p>

          {token && room.available ? (
            <Link
              to={`/book/${room.id}`}
              className="btn btn-primary"
            >
              Book Now
            </Link>
          ) : !token ? (
            <Link
              to="/login"
              state={{ from: `/book/${room.id}` }}
              className="btn btn-primary"
            >
              Log in to Book
            </Link>
          ) : (
            <button className="btn" disabled>
              Unavailable
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
