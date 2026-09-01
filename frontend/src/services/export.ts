import type { Comic } from '../types/Comic';

export function exportComicsAsJson(comics: Comic[]): void {
  const blob = new Blob([JSON.stringify(comics, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `webcomic-tracker-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportComicsAsCsv(comics: Comic[]): void {
  const headers = [
    'ID', 'Webcomic Name', 'Latest Completed Chapter', 'Latest Chapter URL',
    'Website', 'Domain', 'Date First Added', 'Date Last Updated', 'Notes', 'Normalized Title',
  ];
  const rows = comics.map((c) => [
    c.id, c.title, c.chapter, c.url, c.website, c.domain,
    c.dateFirstAdded, c.dateLastUpdated, c.notes, c.normalizedTitle,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `webcomic-tracker-${new Date().toISOString().slice(0, 10)}.csv`);
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportedComic {
  title: string;
  chapter: number;
  url: string;
  website?: string;
  notes?: string;
}

/** Parses an imported JSON file's text content into a normalized array. */
export function parseImportedJson(text: string): ImportedComic[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Imported JSON must be an array of comics.');
  return data.map((item) => ({
    title: String(item.title ?? item['Webcomic Name'] ?? '').trim(),
    chapter: Number(item.chapter ?? item['Latest Completed Chapter']),
    url: String(item.url ?? item['Latest Chapter URL'] ?? '').trim(),
    website: item.website ?? item['Website'] ?? undefined,
    notes: item.notes ?? item['Notes'] ?? undefined,
  })).filter((c) => c.title && c.url && !isNaN(c.chapter));
}
