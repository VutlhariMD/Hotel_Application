import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { AppNotification } from '../types';

type AuthGetState = () => { auth: { token: string | null } };

type NotificationsState = {
  list: AppNotification[];
  unread: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};

const initialState: NotificationsState = {
  list: [],
  unread: 0,
  status: 'idle',
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    return api<{ notifications: AppNotification[]; unread: number }>('/notifications', {
      token,
    });
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: number, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    const data = await api<{ notification: AppNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
      token,
    });
    return data.notification;
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { getState }) => {
    const { token } = (getState as AuthGetState)().auth;
    await api<{ message: string }>('/notifications/read-all', { method: 'POST', token });
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications(state) {
      state.list = [];
      state.unread = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.notifications;
        state.unread = action.payload.unread;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load notifications';
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.list = state.list.map((n) =>
          n.id === action.payload.id ? { ...n, read: true } : n
        );
        state.unread = state.list.filter((n) => !n.read).length;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.list = state.list.map((n) => ({ ...n, read: true }));
        state.unread = 0;
      });
  },
});

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
