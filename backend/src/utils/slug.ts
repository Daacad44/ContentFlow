/**
 * src/utils/slug.ts
 * URL-safe slug generation for workspaces.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function appendRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`.slice(0, 64);
}
