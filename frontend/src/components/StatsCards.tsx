import { useMemo } from 'react';
import type { Comic } from '../types/Comic';
import { daysSince } from '../services/normalization';
import { BookIcon, HistoryIcon, RefreshIcon, SparkleIcon } from './Icons';

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
    {
      label: 'Total Comics', value: stats.total, icon: BookIcon,
      tint: 'bg-accent/10 text-accent',
    },
    {
      label: 'Updated This Week', value: stats.updatedThisWeek, icon: RefreshIcon,
      tint: 'bg-leaf/10 text-leaf',
    },
    {
      label: 'Sources', value: stats.sources, icon: HistoryIcon,
      tint: 'bg-sky/10 text-sky',
    },
    {
      label: 'Recently Updated', value: stats.mostRecent ? stats.mostRecent.title : '—', small: true, icon: SparkleIcon,
      tint: 'bg-gold/15 text-[#a3720a] dark:text-gold',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card flex items-start gap-3 p-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.tint}`}>
            <c.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {c.label}
            </div>
            <div
              className={
                c.small
                  ? 'mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100'
                  : 'mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white'
              }
              title={c.small ? String(c.value) : undefined}
            >
              {c.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
