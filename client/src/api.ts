import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

const TOKEN_KEY = 'halboxpro_token';
const USER_KEY = 'halboxpro_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function getUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      clearSession();
      location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export function apiError(err: unknown): string {
  return (err as any)?.response?.data?.error || (err as any)?.message || 'Bilinmeyen hata';
}
