// Saving overlay state. Every write greys the page out with a progress card the moment a
// button is pressed (so it's clear the click registered and a second click can't send the
// save twice), covers the follow-up library refresh too, flashes a "done" caption, then closes.

export interface BusyState {
  visible: boolean;
  done: boolean;
  label: string;
  detail: string;
  /** 0–100 when real progress is known (e.g. importing many rows); null = indeterminate bar. */
  percent: number | null;
}

const IDLE: BusyState = { visible: false, done: false, label: '', detail: '', percent: null };

/** Caption while the request runs, and the caption flashed on success. */
export const BUSY_TEXT: Record<string, { label: string; done: string }> = {
  addOrUpdateComic: { label: 'Inking your latest chapter…', done: 'Chapter logged' },
  updateComic: { label: 'Redrawing the panels…', done: 'Changes saved' },
  deleteComic: { label: 'Tearing out the page…', done: 'Page removed' },
  uploadCoverImage: { label: 'Printing the cover art…', done: 'Cover ready' },
  vaultSetup: { label: 'Sealing the vault…', done: 'Vault sealed' },
  vaultUnlock: { label: 'Turning the key…', done: 'Unlocked' },
  vaultChangePassword: { label: 'Re-sealing the vault…', done: 'Password changed' },
};
/** Shown only while the overlay is already up: the library refresh that follows a save. */
export const REFRESH_LABEL = 'Restocking the shelves…';
const SLOW_MESSAGE = 'Still inking — Google can take a few seconds…';

let state: BusyState = IDLE;
let count = 0;
let lastAction: string | null = null;
let progressActive = false;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let slowTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Partial<BusyState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const busy = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  getState: () => state,
  isVisible: () => state.visible,

  start(label: string, action?: string) {
    clearTimeout(hideTimer);
    count++;
    if (action) lastAction = action;
    // During a multi-step run the run's own caption and "3 of 12" counter stay put.
    // A follow-up step (the library refresh) continues the same overlay, so the slow-message
    // clock and any message already shown carry over instead of restarting.
    const continuing = state.visible && !state.done;
    set({
      visible: true,
      done: false,
      label: progressActive ? state.label : label,
      detail: progressActive || continuing ? state.detail : '',
    });
    if (!slowTimer) {
      slowTimer = setTimeout(() => {
        slowTimer = undefined;
        if (count && !progressActive) set({ detail: SLOW_MESSAGE });
      }, 6000);
    }
    if (typeof document !== 'undefined') (document.activeElement as HTMLElement | null)?.blur?.();
  },

  end(ok: boolean) {
    count = Math.max(0, count - 1);
    if (count) return;
    if (progressActive) return; // a multi-step run closes the overlay itself
    if (ok) {
      // Short pause so a follow-up step (e.g. the library refresh after a save) continues seamlessly.
      hideTimer = setTimeout(() => {
        set({ done: true, label: (lastAction && BUSY_TEXT[lastAction]?.done) || 'Saved', detail: '', percent: 100 });
        hideTimer = setTimeout(() => busy.hide(), 600);
      }, 100);
    } else {
      busy.hide(); // the error itself is shown as a message
    }
  },

  hide() {
    clearTimeout(hideTimer);
    clearTimeout(slowTimer);
    slowTimer = undefined;
    count = 0;
    lastAction = null;
    progressActive = false;
    set(IDLE);
  },

  /** Real progress for multi-step runs: "3 of 12" and a filling bar. Pass done=null to finish. */
  progress(done: number | null, total = 0, label?: string) {
    if (done === null) {
      progressActive = false;
      set({ percent: null, detail: '' });
      return;
    }
    progressActive = true;
    clearTimeout(hideTimer);
    set({
      visible: true,
      done: false,
      label: label ?? state.label,
      detail: `${Math.min(done + 1, total)} of ${total}`,
      percent: Math.round((done / total) * 100),
    });
  },

  /** Closes a multi-step run with the same green "done" caption single saves get. */
  finish(doneLabel: string) {
    progressActive = false;
    clearTimeout(hideTimer);
    set({ visible: true, done: true, label: doneLabel, detail: '', percent: 100 });
    hideTimer = setTimeout(() => busy.hide(), 700);
  },
};

/** Runs `fn` with the overlay up. `isOk` lets a call that "succeeds" without finishing the job (e.g. needs a confirmation) skip the done flash. */
export async function withBusy<T>(action: string, fn: () => Promise<T>, isOk: (r: T) => boolean = () => true): Promise<T> {
  const text = BUSY_TEXT[action];
  if (!text) return fn();
  busy.start(text.label, action);
  let ok = false;
  try {
    const r = await fn();
    ok = isOk(r);
    return r;
  } finally {
    busy.end(ok);
  }
}

/** For the library reload that follows a save: shows the overlay's refresh caption, but only when it's already up. */
export async function withRefreshBusy<T>(fn: () => Promise<T>): Promise<T> {
  if (!busy.isVisible()) return fn();
  busy.start(REFRESH_LABEL);
  try {
    return await fn();
  } finally {
    busy.end(true);
  }
}
