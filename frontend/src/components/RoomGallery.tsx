import { useState } from 'react';

type Props = {
  name: string;
  images: string[];
  className?: string;
};

export default function RoomGallery({ name, images, className = '' }: Props) {
  const photos = images.length ? images : [];
  const [active, setActive] = useState(0);

  if (!photos.length) {
    return <div className={`room-gallery empty ${className}`}>No photos</div>;
  }

  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div className={`room-gallery ${className}`}>
      <img className="gallery-main" src={current} alt={`${name} photo ${active + 1}`} />
      {photos.length > 1 && (
        <div className="gallery-thumbs">
          {photos.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              className={`gallery-thumb ${index === active ? 'active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
