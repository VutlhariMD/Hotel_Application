/** Backend origin only (no trailing slash). Empty in local dev → Vite proxies `/api`. */
const BACKEND_URL = String(
  import.meta.env.VITE_API_URL ??
    (import.meta.env.PROD ? 'https://hotel-application-backend-yd7r.onrender.com' : '')
).replace(/\/+$/, '');

export const API_BASE = `${BACKEND_URL}/api`;

export const googleAuthUrl = `${API_BASE}/auth/google`;

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api<T>(path: string, { method = 'GET', body, token }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data as T;
}
