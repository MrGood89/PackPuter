export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

export function generateShortName(title: string, botUsername: string): string {
  const slug = slugify(title);
  return `${slug}_by_${botUsername}`;
}

