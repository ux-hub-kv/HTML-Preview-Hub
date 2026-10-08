import { useEffect, useRef, useState } from 'react';
import { friendlyError } from '../lib/folders';
import { cn } from '../lib/utils';

/** Inline name editor: Enter / blur saves, Escape cancels. Keeps editing open when the save fails. */
export default function FolderNameInput({
  initialValue,
  onSubmit,
  onCancel,
  label = 'Tên folder',
  className,
}: {
  initialValue: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  /** What is being named, e.g. "Tên folder" or "Tên file" */
  label?: string;
  className?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async () => {
    if (busy.current) return;
    const name = value.trim();
    if (!name) {
      setError(`Hãy nhập ${label.toLowerCase()}`);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(friendlyError(err));
      busy.current = false;
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative z-10 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          maxLength={200}
          disabled={saving}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          onBlur={() => { if (!error) submit(); }}
          aria-label={label}
          aria-invalid={!!error}
          className={cn('input input-sm w-full min-w-0 flex-1', error && 'input-error', className)}
        />
        {saving && <span className="loading loading-spinner loading-xs shrink-0" />}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error">{error}</p>
      ) : (
        <p className="text-[11px] text-base-content/50">Enter để lưu · Esc để hủy</p>
      )}
    </div>
  );
}
