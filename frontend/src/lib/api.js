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
