import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRooms, setRoomFavorite } from '../store/roomsSlice';
import { addFavorite, removeFavorite } from '../store/favoritesSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import RoomGallery from '../components/RoomGallery';
import HotelMap from '../components/HotelMap';
import { formatZAR } from '../utils/money';
import { whatsappShareUrl } from '../utils/share';

export default function Rooms() {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((s) => s.rooms);
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

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

      {status === 'loading' && <p>Loading rooms…</p>}
      {error && <p className="error">{error}</p>}

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
                Sleeps {room.capacity} · {room.room_type}
                {!room.available && ' · Unavailable'}
              </p>
              <p className="meta room-address">{room.address}</p>

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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
