import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import roomsReducer from './roomsSlice';
import bookingsReducer from './bookingsSlice';
import favoritesReducer from './favoritesSlice';
import adminReducer from './adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomsReducer,
    bookings: bookingsReducer,
    favorites: favoritesReducer,
    admin: adminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
