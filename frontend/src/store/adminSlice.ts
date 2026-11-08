import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Booking } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type AdminState = {
  bookings: Booking[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};

const initialState: AdminState = {
  bookings: [],
  status: 'idle',
  error: null,
};

export const fetchAdminBookings = createAsyncThunk(
  'admin/fetchBookings',
  async (_, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ bookings: Booking[] }>('/bookings/admin/all', { token });
    return data.bookings;
  }
);

export const updateAdminBooking = createAsyncThunk(
  'admin/updateBooking',
  async (
    form: {
      id: number;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      status?: string;
    },
    { getState }
  ) => {
    const { token } = (getState as AuthGetState)().auth;
    const { id, ...body } = form;
    const data = await api<{ booking: Booking }>(`/bookings/admin/${id}`, {
      method: 'PATCH',
      body,
      token,
    });
    return data.booking;
  }
);

export const deleteAdminBooking = createAsyncThunk(
  'admin/deleteBooking',
  async (id: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    await api<{ message: string }>(`/bookings/admin/${id}`, { method: 'DELETE', token });
    return id;
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminBookings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAdminBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.bookings = action.payload;
      })
      .addCase(fetchAdminBookings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load reservations';
      })
      .addCase(updateAdminBooking.fulfilled, (state, action) => {
        state.bookings = state.bookings.map((b) =>
          b.id === action.payload.id
            ? {
                ...b,
                ...action.payload,
                room_name: b.room_name,
                image_url: b.image_url,
                guest_name: b.guest_name,
                guest_email: b.guest_email,
              }
            : b
        );
      })
      .addCase(deleteAdminBooking.fulfilled, (state, action) => {
        state.bookings = state.bookings.filter((b) => b.id !== action.payload);
      });
  },
});

export default adminSlice.reducer;
