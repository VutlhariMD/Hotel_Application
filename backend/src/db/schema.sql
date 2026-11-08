CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  phone VARCHAR(40),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  capacity INT NOT NULL,
  room_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  latitude DECIMAL(10, 7) NOT NULL DEFAULT -23.9045000,
  longitude DECIMAL(10, 7) NOT NULL DEFAULT 29.4689000,
  star_rating INT NOT NULL DEFAULT 4 CHECK (star_rating BETWEEN 1 AND 5),
  facilities TEXT[] NOT NULL DEFAULT '{}',
  policies TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS room_images (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  rooms_count INT NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  card_last4 VARCHAR(4) NOT NULL,
  stripe_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'succeeded',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE IF NOT EXISTS hotel_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name VARCHAR(120) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, room_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reviews_room ON reviews(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
