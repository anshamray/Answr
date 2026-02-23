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
