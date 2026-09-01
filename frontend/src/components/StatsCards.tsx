import { useMemo } from 'react';
import type { Comic } from '../types/Comic';
import { daysSince } from '../services/normalization';
import { BookIcon, HistoryIcon, LayersIcon, RefreshIcon } from './Icons';

export function StatsCards({ comics }: { comics: Comic[] }) {
  const stats = useMemo(() => {
    const total = comics.length;
    const updatedToday = comics.filter((c) => daysSince(c.dateLastUpdated) === 0).length;
    const updatedThisWeek = comics.filter((c) => daysSince(c.dateLastUpdated) <= 7).length;
    const sources = new Set(comics.map((c) => c.website || c.domain)).size;
    const totalChapters = comics.reduce((sum, c) => sum + (Number(c.chapter) || 0), 0);
    return { total, updatedToday, updatedThisWeek, sources, totalChapters };
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
      label: 'Chapters Conquered',
      value: Number.isInteger(stats.totalChapters) ? stats.totalChapters : stats.totalChapters.toFixed(1),
      icon: LayersIcon,
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
            <div className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {c.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
