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
