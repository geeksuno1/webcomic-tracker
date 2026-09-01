/** Normalize a webcomic title for duplicate matching. Mirrors Code.gs's normalizeTitle_. */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  let t = title.toLowerCase();
  t = t.replace(/[_-]+/g, ' ');
  t = t.replace(/['’`]/g, '');
  t = t.replace(/[^a-z0-9 ]+/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or',
  'the', 'to', 'with', 'is',
]);

/** Turn a URL slug like "it-starts-with-a-mountain" into "It Starts With a Mountain". */
export function titleCaseFromSlug(slug: string): string {
  if (!slug) return '';
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug.replace(/\+/g, ' '));
  } catch {
    // ignore malformed encoding
  }
  const words = decoded.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i !== 0 && SMALL_WORDS.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return Infinity;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
