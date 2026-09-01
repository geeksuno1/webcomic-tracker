import type { ParsedChapterInfo } from '../types/Comic';
import { titleCaseFromSlug } from './normalization';

/** Known domain -> human readable website name overrides. */
const KNOWN_WEBSITES: Record<string, string> = {
  'mangaread.org': 'MangaRead',
  'vortexscans.org': 'Vortex Scans',
  'topmanhua.fan': 'TopManhua',
};

/** Path segments that should never be treated as part of the comic title slug. */
const IGNORED_SEGMENTS = new Set([
  'manga', 'manhua', 'manhwa', 'series', 'comic', 'comics', 'webtoon',
  'webtoons', 'read', 'title', 'novel', 'book', 'story',
]);

// Chapter patterns, checked in order of specificity. Captures a number
// (integer or decimal) for the chapter.
const CHAPTER_PATTERNS: RegExp[] = [
  /chapter[-_/]?(\d+(?:\.\d+)?)/i,
  /\bch[-_.]?(\d+(?:\.\d+)?)\b/i,
  /\bc[-_](\d+(?:\.\d+)?)\b/i,
];

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function websiteNameFromDomain(domain: string): string {
  if (!domain) return '';
  if (KNOWN_WEBSITES[domain]) return KNOWN_WEBSITES[domain];
  const base = domain.split('.')[0];
  return base
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractChapter(pathname: string): number | null {
  for (const pattern of CHAPTER_PATTERNS) {
    const m = pathname.match(pattern);
    if (m) {
      const n = parseFloat(m[1]);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function extractTitleSlug(pathname: string): string {
  const segments = pathname
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  // Drop segments that are pure chapter info (e.g. "chapter-68", "ch-5").
  const filtered = segments.filter((seg) => {
    const lower = seg.toLowerCase();
    if (IGNORED_SEGMENTS.has(lower)) return false;
    if (/^chapter[-_]?\d/i.test(lower)) return false;
    if (/^ch[-_.]?\d/i.test(lower)) return false;
    if (/^c[-_]\d/i.test(lower)) return false;
    if (/^\d+(\.\d+)?$/.test(lower)) return false; // bare numeric segment
    return true;
  });

  if (filtered.length === 0) return '';

  // The comic slug is usually the longest remaining segment (most hyphens),
  // or simply the last one if there's ambiguity.
  filtered.sort((a, b) => b.split('-').length - a.split('-').length);
  return filtered[0];
}

/**
 * Attempt to extract webcomic title, chapter number, and website info from a
 * chapter URL. Designed to work across many manga/manhwa/webtoon site
 * structures, not just the example domains.
 */
export function parseChapterUrl(rawUrl: string): ParsedChapterInfo {
  const url = rawUrl.trim();
  const domain = extractDomain(url);
  const website = websiteNameFromDomain(domain);

  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = '';
  }

  const chapter = extractChapter(pathname);
  const slug = extractTitleSlug(pathname);
  const title = slug ? titleCaseFromSlug(slug) : '';

  return {
    title,
    chapter,
    website,
    domain,
    url,
    chapterDetected: chapter !== null,
    titleDetected: title.length > 0,
  };
}

export function isLikelyUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}
