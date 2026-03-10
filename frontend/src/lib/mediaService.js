/**
 * Media Upload Service
 *
 * Handles uploading media files to the backend API with progress tracking.
 */

import { apiUrl } from './api.js';
import { useAuthStore } from '../stores/authStore.js';

/**
 * Upload a media file to the server.
 *
 * @param {File} file - The file to upload
 * @param {Function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<{ id: string, url: string, originalName: string, size: number }>}
 */
export async function uploadMedia(file, onProgress) {
  return new Promise((resolve, reject) => {
    const auth = useAuthStore();
    const xhr = new XMLHttpRequest();

    xhr.open('POST', apiUrl('/api/media/upload'));
    xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);

    // Track upload progress
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success && response.data?.media) {
            resolve(response.data.media);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid server response'));
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.message || response.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled'));
    };

    // Create FormData and send
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

/**
 * Check if a URL is a local media URL (starts with /media/).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isLocalMediaUrl(url) {
  return typeof url === 'string' && url.startsWith('/media/');
}

/**
 * Check if a URL is a data URL (base64 encoded).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isDataUrl(url) {
  return typeof url === 'string' && url.startsWith('data:');
}

/**
 * Delete a media file from the server.
 *
 * @param {string} mediaId - The media ID (from the URL /media/{id})
 * @returns {Promise<void>}
 */
export async function deleteMedia(mediaId) {
  const auth = useAuthStore();

  const response = await fetch(apiUrl(`/api/media/${mediaId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to delete media');
  }
}

/**
 * Detect if a URL is a supported external video (YouTube or Vimeo).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isExternalVideoUrl(url) {
  return !!getExternalVideoEmbedUrl(url);
}

/**
 * Convert a YouTube or Vimeo URL into an embeddable URL suitable for iframes.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function getExternalVideoEmbedUrl(url) {
  if (typeof url !== 'string' || !url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  // YouTube (watch, share, shorts)
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    let videoId = '';

    if (host.includes('youtu.be')) {
      // https://youtu.be/{id}
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      // https://www.youtube.com/shorts/{id}
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    } else if (parsed.searchParams.get('v')) {
      // https://www.youtube.com/watch?v={id}
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      // Already an embed URL
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    }

    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Vimeo
  if (host.includes('vimeo.com')) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const videoId = segments[segments.length - 1];
    if (!videoId || !/^\d+$/.test(videoId)) return null;
    return `https://player.vimeo.com/video/${videoId}`;
  }

  return null;
}
