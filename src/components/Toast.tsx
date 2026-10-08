import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ToastOptions {
  message: React.ReactNode;
  detail?: React.ReactNode;
  action?: { label: string; onClick: () => Promise<void> | void };
  /** ms before it closes on its own */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Single toast at a time; it survives route changes so a delete on one page can be undone on the next. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);
  const close = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onClose={close} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (busy || hovered) return;
    const timer = setTimeout(onClose, toast.duration ?? 8000);
    return () => clearTimeout(timer);
  }, [busy, hovered, toast.duration, onClose]);

  const runAction = async () => {
    if (!toast.action) return;
    setBusy(true);
    setFailed(false);
    try {
      await toast.action.onClick();
      onClose();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-box bg-neutral p-4 text-neutral-content shadow-xl"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.message}</p>
        {toast.detail && <p className="mt-1 text-xs text-neutral-content/70">{toast.detail}</p>}
        {failed && <p className="mt-1 text-xs text-error">Không hoàn tác được. Hãy thử lại.</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={runAction}
          disabled={busy}
          className="btn btn-sm btn-primary shrink-0"
        >
          {busy && <span className="loading loading-spinner loading-xs" />}
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="btn btn-ghost btn-circle btn-xs shrink-0 text-neutral-content/70 hover:bg-neutral-content/10">
        <X size={14} />
      </button>
    </div>
  );
}
