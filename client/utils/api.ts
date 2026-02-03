/// <reference types="vite/client" />
// Prefer explicit API base; otherwise use same-origin (Vite proxy handles /api in dev).
const RAW_API_BASE = import.meta.env.VITE_API_URL || '';

const normalizeBase = (base: string, path: string) => {
  if (!base) return path;
  const baseTrim = base.endsWith('/') ? base.slice(0, -1) : base;
  const pathTrim = path.startsWith('/') ? path : `/${path}`;
  if (baseTrim.endsWith('/api') && pathTrim.startsWith('/api/')) {
    return `${baseTrim}${pathTrim.slice(4)}`;
  }
  return `${baseTrim}${pathTrim}`;
};

export const getAuthToken = () => localStorage.getItem('matlance_token');

export const setAuthToken = (token: string | null) => {
  if (token) localStorage.setItem('matlance_token', token);
  else localStorage.removeItem('matlance_token');
};

export const apiRequest = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {})
  };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = normalizeBase(RAW_API_BASE, path);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const bodyText = await res.text();
      if (bodyText) {
        try {
          const data = JSON.parse(bodyText);
          message = data.message || message;
        } catch {
          message = bodyText;
        }
      }
    } catch {
      // ignore
    }
    if (res.status === 401 || res.status === 403) {
      const lower = String(message || '').toLowerCase();
      if (lower.includes('blocked') || lower.includes('pending') || lower.includes('not authorized')) {
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/#/login';
        }
      }
    }
    throw new Error(message);
  }

  if (res.status === 204) return {} as T;
  return res.json();
};
