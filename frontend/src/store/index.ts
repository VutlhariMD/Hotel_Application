import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import roomsReducer from './roomsSlice';
import bookingsReducer from './bookingsSlice';
import favoritesReducer from './favoritesSlice';
import adminReducer from './adminSlice';
import notificationsReducer from './notificationsSlice';
import reviewsReducer from './reviewsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomsReducer,
    bookings: bookingsReducer,
    favorites: favoritesReducer,
    admin: adminReducer,
    notifications: notificationsReducer,
    reviews: reviewsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
