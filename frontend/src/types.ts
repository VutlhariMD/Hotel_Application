export type UserRole = 'user' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
};

export type Room = {
  id: number;
  name: string;
  description: string;
  price_per_night: string | number;
  capacity: number;
  room_type: string;
  available: boolean;
  image_url: string;
  address: string;
  latitude: number;
  longitude: number;
  images: string[];
  is_favorite?: boolean;
};

export type Booking = {
  id: number;
  user_id?: number;
  room_id?: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: string | number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at?: string;
  room_name: string;
  image_url: string;
  price_per_night?: string | number;
  capacity?: number;
  nights?: number;
  guest_name?: string;
  guest_email?: string;
};

export type MapLocation = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type HotelLocation = MapLocation & {
  id: number;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type PaymentResult = {
  message: string;
  bookingId: number;
  payment: {
    stripeId: string;
    amount: number;
    last4: string;
    status: string;
  };
};

export type SavedAuth = {
  user: User;
  token: string;
};

export type RoomFormPayload = {
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  room_type: string;
  available: boolean;
  images: string[];
  address: string;
  latitude: number;
  longitude: number;
};
