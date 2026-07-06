import cloudinary from '../config/cloudinary.js';

const MIME_FORMATS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
};

function extensionFromName(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return match?.[1] || '';
}

function formatForDocument(doc) {
  const mimeFormat = MIME_FORMATS[String(doc.mimeType || '').toLowerCase()];
  return mimeFormat || extensionFromName(doc.name);
}

export function resourceTypeForDocument(doc) {
  const path = (() => {
    try {
      return new URL(doc.url).pathname;
    } catch {
      return String(doc.url || '');
    }
  })();
  const segments = path.split('/').filter(Boolean);
  const fromUrl = segments.find((segment) => ['image', 'raw', 'video'].includes(segment));
  if (fromUrl) return fromUrl;

  const mimeType = String(doc.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}

function publicIdAlreadyHasFormat(publicId, format) {
  if (!format) return false;
  const lastSegment = String(publicId || '').split('/').pop()?.toLowerCase() || '';
  if (format === 'jpg') return lastSegment.endsWith('.jpg') || lastSegment.endsWith('.jpeg');
  return lastSegment.endsWith(`.${format}`);
}

export function signedDownloadUrlForDocument(doc, ttlSeconds = 300, options = {}) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const format = formatForDocument(doc);
  const url = cloudinary.utils.private_download_url(
    doc.storageKey,
    publicIdAlreadyHasFormat(doc.storageKey, format) ? '' : format,
    {
      resource_type: resourceTypeForDocument(doc),
      type: 'authenticated',
      expires_at: expires,
      ...options,
    },
  );
  return { url, expiresAt: expires };
}
