import { useEffect, useState } from 'react';
import { api } from '../api/client';
import HotelMap from '../components/HotelMap';
import type { HotelLocation } from '../types';

export default function Location() {
  const [hotel, setHotel] = useState<HotelLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ hotel: HotelLocation }>('/hotel/location')
      .then((data) => setHotel(data.hotel))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="location-page">
      <div className="page-intro">
        <h1>Find us</h1>
        <p className="muted">Main hotel pin — each room also shows its own address on the rooms page.</p>
      </div>

      {loading && <p>Loading map…</p>}
      {error && <p className="error">{error}</p>}
      {hotel && <HotelMap location={hotel} height={420} />}
    </section>
  );
}
