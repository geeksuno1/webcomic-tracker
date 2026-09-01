import { useMemo } from 'react';
import type { Comic } from '../types/Comic';
import { daysSince } from '../services/normalization';

export function StatsCards({ comics }: { comics: Comic[] }) {
  const stats = useMemo(() => {
    const total = comics.length;
    const updatedToday = comics.filter((c) => daysSince(c.dateLastUpdated) === 0).length;
    const updatedThisWeek = comics.filter((c) => daysSince(c.dateLastUpdated) <= 7).length;
    const sources = new Set(comics.map((c) => c.website || c.domain)).size;
    let mostRecent: Comic | null = null;
    for (const c of comics) {
      if (!mostRecent || daysSince(c.dateLastUpdated) < daysSince(mostRecent.dateLastUpdated)) {
        mostRecent = c;
      }
    }
    return { total, updatedToday, updatedThisWeek, sources, mostRecent };
  }, [comics]);

  const cards = [
    { label: 'Total Comics', value: stats.total },
    { label: 'Updated This Week', value: stats.updatedThisWeek },
    { label: 'Sources', value: stats.sources },
    { label: 'Recently Updated', value: stats.mostRecent ? stats.mostRecent.title : '—', small: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {c.label}
          </div>
          <div
            className={
              c.small
                ? 'mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100'
                : 'mt-1 text-2xl font-bold text-slate-900 dark:text-white'
            }
            title={c.small ? String(c.value) : undefined}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
