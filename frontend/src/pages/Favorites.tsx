import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFavorites, removeFavorite } from '../store/favoritesSlice';
import { setRoomFavorite } from '../store/roomsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import RoomGallery from '../components/RoomGallery';
import HotelMap from '../components/HotelMap';
import { formatZAR } from '../utils/money';
import { whatsappShareUrl } from '../utils/share';

export default function Favorites() {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((s) => s.favorites);

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  async function onRemove(roomId: number) {
    await dispatch(removeFavorite(roomId));
    dispatch(setRoomFavorite({ roomId, isFavorite: false }));
  }

  return (
    <section className="rooms-page">
      <div className="page-intro">
        <h1>Favorites</h1>
        <p className="muted">Rooms you saved for later.</p>
      </div>

      {status === 'loading' && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!list.length && status !== 'loading' && (
        <p className="muted">
          No favorites yet. <Link to="/">Browse rooms</Link>
        </p>
      )}

      <div className="room-grid room-grid-wide">
        {list.map((room) => (
          <article key={room.id} className="room-card room-card-rich">
            <RoomGallery
              name={room.name}
              images={room.images?.length ? room.images : [room.image_url]}
            />
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
              </p>
              <p className="meta room-address">{room.address}</p>
              <HotelMap
                location={{
                  name: room.name,
                  address: room.address,
                  latitude: Number(room.latitude),
                  longitude: Number(room.longitude),
                }}
                height={200}
              />
              <div className="room-actions">
                <Link className="btn btn-primary" to={`/book/${room.id}`}>
                  Book now
                </Link>
                <button type="button" className="btn btn-ghost" onClick={() => onRemove(room.id)}>
                  Remove
                </button>
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
