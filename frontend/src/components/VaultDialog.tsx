import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../services/api';
import { LockIcon, XIcon } from './Icons';

export type VaultDialogMode = 'unlock' | 'setup' | 'change';

interface Props {
  mode: VaultDialogMode;
  onSuccess: (token: string) => void;
  onClose: () => void;
}

const MIN_LENGTH = 6;

/** Password prompt for the vault: first-time setup, unlock, or change password. */
export function VaultDialog({ mode, onSuccess, onClose }: Props) {
  const [oldPw, setOldPw] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const title =
    mode === 'setup' ? 'Create your vault password' : mode === 'change' ? 'Change vault password' : 'Unlock the Vault';
  const needsNew = mode === 'setup' || mode === 'change';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (needsNew) {
      if (pw.length < MIN_LENGTH) return setError(`Choose a password of at least ${MIN_LENGTH} characters.`);
      if (pw !== confirm) return setError('The two passwords don’t match.');
    }
    setBusy(true);
    try {
      const result =
        mode === 'setup'
          ? await api.vaultSetup(pw)
          : mode === 'change'
            ? await api.vaultChangePassword(oldPw, pw)
            : await api.vaultUnlock(pw);
      onSuccess(result.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <form
        className="card animate-in w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <LockIcon className="h-4 w-4 text-accent" /> {title}
          </h3>
          <button type="button" className="btn btn-secondary !p-1.5" onClick={onClose} disabled={busy} aria-label="Close">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {mode === 'setup' && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Titles you move into the Vault are hidden from the library, stats, search and exports until you unlock it.
            There is no “forgot password” button in the app, so pick one you’ll remember.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {mode === 'change' && (
            <Field label="Current password">
              <input
                ref={firstField}
                type="password"
                className="input"
                autoComplete="current-password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                disabled={busy}
              />
            </Field>
          )}
          <Field label={needsNew ? 'New password' : 'Password'}>
            <input
              ref={mode === 'change' ? undefined : firstField}
              type="password"
              className="input"
              autoComplete={needsNew ? 'new-password' : 'current-password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              disabled={busy}
            />
          </Field>
          {needsNew && (
            <Field label="Confirm new password">
              <input
                type="password"
                className="input"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
              />
            </Field>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !pw}>
            {busy ? 'Checking…' : mode === 'setup' ? 'Create vault' : mode === 'change' ? 'Change password' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
