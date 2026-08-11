import { getDomain } from 'tldts';

export function portalFor(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const domain = getDomain(u.hostname);
  return domain ?? u.hostname;
}

export function normalizeUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).toString();
  } catch {
    return rawUrl;
  }
}
