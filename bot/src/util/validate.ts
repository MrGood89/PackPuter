export function isValidVideoFile(mimeType: string): boolean {
  const validTypes = [
    'video/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'image/gif',
  ];
  return validTypes.includes(mimeType);
}

export function isValidImageFile(mimeType: string): boolean {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  return validTypes.includes(mimeType);
}

