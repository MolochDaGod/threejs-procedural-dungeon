/** Binary URL SSOT — VFX/kit on CDN; SPA-shipped creatures/forms/props stay same-origin. */
import { CDN } from '../ssot.js';

const LOCAL_MODELS = /^models\/(creatures|forms|props)\//;

export function resolvePlayUrl(url) {
  if (!url) return url;
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/@fs\/|[A-Za-z]:[\\/]|\\\\/.test(s)) return '';
  const rel = s.replace(/^\//, '');
  if (LOCAL_MODELS.test(rel)) return `/${rel}`;
  if (rel.startsWith('models/')) return `${CDN}/${rel}`;
  if (s.startsWith('/ui/') || s.startsWith('ui/')) return `${CDN}/${rel}`;
  if (s.startsWith('/')) return `${CDN}${s}`;
  return s;
}
