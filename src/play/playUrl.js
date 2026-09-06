/** Binary URL SSOT — relative models/ keys live on assets CDN, not this SPA. */
import { CDN } from '../ssot.js';

export function resolvePlayUrl(url) {
  if (!url) return url;
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/models/') || s.startsWith('models/')) {
    return `${CDN}/${s.replace(/^\//, '')}`;
  }
  if (s.startsWith('/')) return `${CDN}${s}`;
  return s;
}
