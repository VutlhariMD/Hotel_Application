import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Review } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type ReviewsState = {
  byRoom: Record<number, Review[]>;
  avgByRoom: Record<number, number | null>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};

const initialState: ReviewsState = {
  byRoom: {},
  avgByRoom: {},
  status: 'idle',
  error: null,
};

export const fetchReviews = createAsyncThunk('reviews/fetchForRoom', async (roomId: number) => {
  const data = await api<{ reviews: Review[]; avg_rating: number | null; count: number }>(
    `/reviews/room/${roomId}`
  );
  return { roomId, ...data };
});

export const submitReview = createAsyncThunk(
  'reviews/submit',
  async (
    form: { roomId: number; rating: number; comment: string },
    { getState }
  ) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ review: Review }>('/reviews', {
      method: 'POST',
      body: form,
      token,
    });
    return { roomId: form.roomId, review: data.review };
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.byRoom[action.payload.roomId] = action.payload.reviews;
        state.avgByRoom[action.payload.roomId] = action.payload.avg_rating;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load reviews';
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        const list = state.byRoom[action.payload.roomId] || [];
        const withoutMine = list.filter((r) => r.user_id !== action.payload.review.user_id);
        state.byRoom[action.payload.roomId] = [action.payload.review, ...withoutMine];
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save review';
      });
  },
});

export default reviewsSlice.reducer;
