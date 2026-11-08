import type { MapLocation } from '../types';

type Props = {
  location: MapLocation;
  height?: number;
};

export default function HotelMap({ location, height = 360 }: Props) {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const delta = 0.01;
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const openUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="map-wrap">
      <iframe
        title={`${location.name} location map`}
        src={embedSrc}
        style={{ border: 0, width: '100%', height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="map-meta">
        <div>
          <strong>{location.name}</strong>
          <p className="muted small">{location.address}</p>
        </div>
        <a className="btn btn-ghost btn-sm" href={openUrl} target="_blank" rel="noreferrer">
          Open map
        </a>
      </div>
    </div>
  );
}
