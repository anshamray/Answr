/**
 * API base URL for production (e.g. https://api.answr.ing).
 * Empty in dev when Vite proxies /api and /media to the backend.
 */
export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Resolve an API or media path to a full URL when apiBase is set.
 * Use for fetch() and for resources that must hit the backend (e.g. /media/...).
 */
export function apiUrl(path) {
  if (!path) return apiBase || '';
  if (path.startsWith('http')) return path;
  return apiBase ? `${apiBase}${path.startsWith('/') ? '' : '/'}${path}` : path;
}

/**
 * Build a media URL with the auth token as a query parameter.
 * Use for <img> src and similar attributes that can't send Authorization headers.
 */
export function authMediaUrl(path, token) {
  const url = apiUrl(path);
  if (!url || !token) return url;
  if (url.startsWith('http') && !url.startsWith(apiBase || '____')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/**
 * Lightweight API helper that centralizes fetch, auth headers and JSON parsing.
 * This keeps auth logic in one place and gives callers typed responses.
 */
export async function apiRequest(path, options = {}, token) {
  const url = apiUrl(path);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non‑JSON or empty responses are allowed; data stays null.
  }

  if (!res.ok) {
    const message = data?.error || data?.message || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}
