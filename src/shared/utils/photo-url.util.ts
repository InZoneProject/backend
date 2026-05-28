type RequestWithHost = {
  protocol: string;
  get(name: string): string | undefined;
};

export function mapPhotoToAbsoluteUrl(
  photoPath: string | null,
  req: RequestWithHost,
): string | null {
  if (!photoPath) {
    return null;
  }

  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }

  const host = firstHeaderValue(req.get('x-forwarded-host')) ?? req.get('host');
  if (!host) {
    return toPublicUploadPath(photoPath);
  }

  const protocol =
    firstHeaderValue(req.get('x-forwarded-proto')) ?? req.protocol;
  return `${protocol}://${host}${toPublicUploadPath(photoPath)}`;
}

function firstHeaderValue(value: string | undefined): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}

function toPublicUploadPath(photoPath: string): string {
  const normalizedPath = photoPath.replace(/\\/g, '/').replace(/^\.\//, '');
  const uploadsIndex = normalizedPath.lastIndexOf('/uploads/');

  if (uploadsIndex >= 0) {
    return normalizedPath.slice(uploadsIndex);
  }

  if (normalizedPath.startsWith('uploads/')) {
    return `/${normalizedPath}`;
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  return `/uploads/${normalizedPath.split('/').pop()}`;
}
