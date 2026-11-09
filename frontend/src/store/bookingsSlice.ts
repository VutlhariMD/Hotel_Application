import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Booking, PaymentResult } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type BookingsState = {
  list: Booking[];
  current: Booking | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  payStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  payError: string | null;
  lastPayment: PaymentResult | null;
};

const initialState: BookingsState = {
  list: [],
  current: null,
  status: 'idle',
  payStatus: 'idle',
  error: null,
  payError: null,
  lastPayment: null,
};

export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMine',
  async (_, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ bookings: Booking[] }>('/bookings', { token });
    return data.bookings;
  }
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchOne',
  async (id: string, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ booking: Booking }>(`/bookings/${id}`, { token });
    return data.booking;
  }
);

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (
    form: {
      roomId: number;
      checkIn: string;
      checkOut: string;
      guests: number;
      roomsCount?: number;
    },
    { getState }
  ) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ booking: Booking }>('/bookings', {
      method: 'POST',
      body: form,
      token,
    });
    return data.booking;
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async (id: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ booking: Booking }>(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      token,
    });
    return data.booking;
  }
);

export const createPaymentIntent = createAsyncThunk(
  'bookings/createPaymentIntent',
  async (bookingId: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    return api<{ clientSecret: string; paymentIntentId: string; amount: number }>(
      '/payments/create-intent',
      { method: 'POST', body: { bookingId }, token }
    );
  }
);

export const completeStripePayment = createAsyncThunk(
  'bookings/completeStripePayment',
  async (
    form: { bookingId: number; paymentIntentId: string },
    { getState }
  ) => {
    const { token } = (getState as AuthGetState)().auth;
    return api<PaymentResult>('/payments/complete', { method: 'POST', body: form, token });
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookingError(state) {
      state.error = null;
      state.payError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBookings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load bookings';
      })
      .addCase(fetchBooking.fulfilled, (state, action) => {
        state.current = action.payload;
        state.payStatus = action.payload.status === 'paid' ? 'succeeded' : 'idle';
      })
      .addCase(createBooking.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create booking';
      })
      .addCase(createPaymentIntent.pending, (state) => {
        state.payStatus = 'loading';
        state.payError = null;
      })
      .addCase(createPaymentIntent.fulfilled, (state) => {
        state.payStatus = 'idle';
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.payStatus = 'failed';
        state.payError = action.error.message || 'Failed to start payment';
      })
      .addCase(completeStripePayment.pending, (state) => {
        state.payStatus = 'loading';
        state.payError = null;
      })
      .addCase(completeStripePayment.fulfilled, (state, action) => {
        state.payStatus = 'succeeded';
        state.lastPayment = action.payload;
        if (state.current) state.current.status = 'paid';
      })
      .addCase(completeStripePayment.rejected, (state, action) => {
        state.payStatus = 'failed';
        state.payError = action.error.message || 'Payment failed';
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.list = state.list.map((b) =>
          b.id === action.payload.id ? { ...b, status: 'cancelled' } : b
        );
        if (state.current?.id === action.payload.id) {
          state.current = { ...state.current, status: 'cancelled' };
        }
      });
  },
});

export const { clearBookingError } = bookingsSlice.actions;
export default bookingsSlice.reducer;
