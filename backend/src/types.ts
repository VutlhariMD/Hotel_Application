import type { Request } from 'express';

export type UserRole = 'user' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  password?: string | null;
  google_id?: string | null;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
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
  latitude: string | number;
  longitude: string | number;
  star_rating?: number;
  facilities?: string[];
  policies?: string;
  images?: string[];
  is_favorite?: boolean;
  avg_rating?: number | null;
  review_count?: number;
};

export type Booking = {
  id: number;
  user_id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  rooms_count?: number;
  total_price: string | number;
  status: 'pending' | 'paid' | 'cancelled' | 'approved';
  created_at?: string;
  room_name?: string;
  image_url?: string;
  price_per_night?: string | number;
  capacity?: number;
  nights?: number;
  guest_name?: string;
  guest_email?: string;
};

export type Review = {
  id: number;
  user_id: number;
  room_id: number;
  rating: number;
  comment: string;
  created_at?: string;
  user_name?: string;
};

export type Notification = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at?: string;
};

export type HotelSettings = {
  id: number;
  name: string;
  address: string;
  latitude: string | number;
  longitude: string | number;
};

export type AuthPayload = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthedRequest = Request & {
  user: AuthPayload;
};
