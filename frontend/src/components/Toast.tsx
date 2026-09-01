import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertIcon, CheckCircleIcon, InfoIcon } from './Icons';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              'card animate-in flex items-start gap-2.5 px-4 py-3 text-sm shadow-lg ' +
              (t.kind === 'success'
                ? 'border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-300'
                : t.kind === 'error'
                ? 'border-rose-200 text-rose-800 dark:border-rose-900 dark:text-rose-300'
                : '')
            }
          >
            <span className="mt-0.5 shrink-0">
              {t.kind === 'success' && <CheckCircleIcon className="h-4 w-4" />}
              {t.kind === 'error' && <AlertIcon className="h-4 w-4" />}
              {t.kind === 'info' && <InfoIcon className="h-4 w-4" />}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
