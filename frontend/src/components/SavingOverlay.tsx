import { useSyncExternalStore } from 'react';
import { busy } from '../services/busy';

/**
 * Greys out the page while a save is in progress, with a card that says what the
 * tracker is doing (in manga-flavoured wording), then flashes a green tick and closes.
 */
export function SavingOverlay() {
  const s = useSyncExternalStore(busy.subscribe, busy.getState, busy.getState);
  const determinate = s.percent !== null && !s.done;

  return (
    <div
      className={`busy-overlay fixed inset-0 z-[200] flex items-center justify-center bg-ink/45 backdrop-blur-[1px] ${s.visible ? 'is-shown' : ''} ${s.done ? 'is-done' : ''}`}
      aria-hidden={!s.visible}
    >
      <div
        role="status"
        aria-live="polite"
        className="card animate-in w-[min(320px,calc(100vw-32px))] px-6 py-5 text-center"
      >
        <div className="busy-spinner mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink/10 border-t-accent dark:border-white/15 dark:border-t-accent">
          {s.done && <span className="text-base font-extrabold leading-none text-leaf">✓</span>}
        </div>
        <div className="font-display text-base font-semibold tracking-wide text-slate-900 dark:text-white">{s.label}</div>
        <div className="mt-1 min-h-[1.2em] text-xs text-slate-500 dark:text-slate-400">{s.detail}</div>
        <div className="relative mt-3.5 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
          <div
            className={`busy-bar-fill absolute inset-y-0 left-0 rounded-full ${s.done ? 'bg-leaf' : 'bg-accent'} ${determinate ? 'is-determinate' : ''}`}
            style={s.done ? { width: '100%' } : determinate ? { width: `${s.percent}%` } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
