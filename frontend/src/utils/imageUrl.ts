import { API_BASE_URL } from '@/services/api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Normalizes an image path to a full URL.
 * Handles absolute URLs, relative paths starting with /, and missing images.
 * Prevents duplicate slashes and invalid paths.
 */
export const getImageUrl = (image?: string | null, fallback?: string): string => {
  if (!image) return fallback || '';
  if (image.startsWith('blob:')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;

  // If path contains /api/uploads, clean it up to just /uploads
  let cleanPath = image.replace(/^\/?api\/uploads/, '/uploads');

  // Strip duplicate leading slashes
  while (cleanPath.startsWith('//')) {
    cleanPath = cleanPath.substring(1);
  }

  // Ensure it starts with a single slash
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  return `${API_ORIGIN}${cleanPath}`;
};
