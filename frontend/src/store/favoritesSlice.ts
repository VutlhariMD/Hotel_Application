import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Room } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type FavoritesState = {
  list: Room[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};

const initialState: FavoritesState = {
  list: [],
  status: 'idle',
  error: null,
};

export const fetchFavorites = createAsyncThunk('favorites/fetch', async (_, { getState }) => {
  const { token } = (getState as AuthGetState)().auth;
  const data = await api<{ favorites: Room[] }>('/favorites', { token });
  return data.favorites;
});

export const addFavorite = createAsyncThunk(
  'favorites/add',
  async (roomId: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    await api<{ roomId: number }>(`/favorites/${roomId}`, { method: 'POST', token });
    return roomId;
  }
);

export const removeFavorite = createAsyncThunk(
  'favorites/remove',
  async (roomId: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    await api<{ roomId: number }>(`/favorites/${roomId}`, { method: 'DELETE', token });
    return roomId;
  }
);

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load favorites';
      })
      .addCase(removeFavorite.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r.id !== action.payload);
      });
  },
});

export default favoritesSlice.reducer;
