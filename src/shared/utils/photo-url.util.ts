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

  const host = req.get('host');
  if (!host) {
    return photoPath;
  }

  const prefix = photoPath.startsWith('/') ? '' : '/';
  return `${req.protocol}://${host}${prefix}${photoPath}`;
}
