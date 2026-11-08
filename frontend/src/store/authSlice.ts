import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import type { AuthResponse, SavedAuth, User } from '../types';

function loadSaved(): SavedAuth | null {
  try {
    const raw = JSON.parse(localStorage.getItem('hhotel_auth') || 'null') as SavedAuth | null;
    if (!raw?.user || !raw.token) return null;
    return {
      ...raw,
      user: { ...raw.user, role: raw.user.role === 'admin' ? 'admin' : 'user' },
    };
  } catch {
    return null;
  }
}

function persist(user: User, token: string) {
  localStorage.setItem('hhotel_auth', JSON.stringify({ user, token }));
}

const saved = loadSaved();

type AuthState = {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  googleEnabled: boolean;
};

const initialState: AuthState = {
  user: saved?.user || null,
  token: saved?.token || null,
  status: 'idle',
  error: null,
  googleEnabled: false,
};

export const register = createAsyncThunk(
  'auth/register',
  async (form: { name: string; email: string; password: string }) => {
    return api<AuthResponse>('/auth/register', { method: 'POST', body: form });
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (form: { email: string; password: string }) => {
    return api<AuthResponse>('/auth/login', { method: 'POST', body: form });
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    form: {
      name: string;
      email: string;
      phone?: string;
      password?: string;
      currentPassword?: string;
    },
    { getState }
  ) => {
    const { token } = (getState as () => { auth: AuthState })().auth;
    return api<AuthResponse>('/auth/profile', { method: 'PATCH', body: form, token });
  }
);

export const checkGoogleAuth = createAsyncThunk('auth/googleStatus', async () => {
  const data = await api<{ enabled: boolean }>('/auth/google/status');
  return data.enabled;
});

export const applyAuthSession = createAsyncThunk(
  'auth/applySession',
  async (payload: AuthResponse) => payload
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('hhotel_auth');
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AuthState) => {
      state.status = 'loading';
      state.error = null;
    };
    const rejected = (state: AuthState, action: { error: { message?: string } }) => {
      state.status = 'failed';
      state.error = action.error.message || 'Request failed';
    };
    const fulfilled = (state: AuthState, action: { payload: AuthResponse }) => {
      state.status = 'succeeded';
      state.user = action.payload.user;
      state.token = action.payload.token;
      persist(action.payload.user, action.payload.token);
    };

    builder
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, fulfilled)
      .addCase(register.rejected, rejected)
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, fulfilled)
      .addCase(login.rejected, rejected)
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.fulfilled, fulfilled)
      .addCase(updateProfile.rejected, rejected)
      .addCase(applyAuthSession.fulfilled, fulfilled)
      .addCase(checkGoogleAuth.fulfilled, (state, action) => {
        state.googleEnabled = action.payload;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
