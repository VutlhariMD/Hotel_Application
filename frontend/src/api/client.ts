const API = `${ (import.meta.env.V_BACKEND_URL|| '').replace(/\/+$/, '')}/api`;


type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api<T>(path: string, { method = 'GET', body, token }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
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
