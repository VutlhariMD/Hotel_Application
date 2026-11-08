import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { Room, RoomFormPayload, RoomSearchFilters } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type RoomsState = {
  list: Room[];
  current: Room | null;
  types: string[];
  filters: RoomSearchFilters;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};

const initialState: RoomsState = {
  list: [],
  current: null,
  types: [],
  filters: {},
  status: 'idle',
  error: null,
};

function toQuery(filters: RoomSearchFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const fetchRooms = createAsyncThunk(
  'rooms/fetchAll',
  async (filters: RoomSearchFilters | undefined, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ rooms: Room[] }>(`/rooms${toQuery(filters)}`, { token });
    return data.rooms;
  }
);

export const fetchRoom = createAsyncThunk('rooms/fetchOne', async (id: string, { getState }) => {
  const { token } = (getState as AuthGetState)().auth;
  const data = await api<{ room: Room }>(`/rooms/${id}`, { token });
  return data.room;
});

export const fetchRoomTypes = createAsyncThunk('rooms/fetchTypes', async () => {
  const data = await api<{ types: string[] }>('/rooms/types/list');
  return data.types;
});

export const createRoom = createAsyncThunk(
  'rooms/create',
  async (form: RoomFormPayload, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ room: Room }>('/rooms', { method: 'POST', body: form, token });
    return data.room;
  }
);

export const updateRoom = createAsyncThunk(
  'rooms/update',
  async (form: RoomFormPayload & { id: number }, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const { id, ...body } = form;
    const data = await api<{ room: Room }>(`/rooms/${id}`, { method: 'PUT', body, token });
    return data.room;
  }
);

export const deleteRoom = createAsyncThunk('rooms/delete', async (id: number, { getState }) => {
  const { token } = (getState as AuthGetState)().auth;
  await api<{ message: string }>(`/rooms/${id}`, { method: 'DELETE', token });
  return id;
});

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    clearCurrentRoom(state) {
      state.current = null;
    },
    setRoomFilters(state, action: { payload: RoomSearchFilters }) {
      state.filters = action.payload;
    },
    setRoomFavorite(state, action: { payload: { roomId: number; isFavorite: boolean } }) {
      const { roomId, isFavorite } = action.payload;
      state.list = state.list.map((r) =>
        r.id === roomId ? { ...r, is_favorite: isFavorite } : r
      );
      if (state.current?.id === roomId) {
        state.current = { ...state.current, is_favorite: isFavorite };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load rooms';
      })
      .addCase(fetchRoom.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(fetchRoomTypes.fulfilled, (state, action) => {
        state.types = action.payload;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        state.list = state.list.map((r) => (r.id === action.payload.id ? action.payload : r));
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r.id !== action.payload);
      });
  },
});

export const { clearCurrentRoom, setRoomFavorite, setRoomFilters } = roomsSlice.actions;
export default roomsSlice.reducer;
