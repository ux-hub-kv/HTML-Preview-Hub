import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder as FolderIcon, Home, Loader2, AlertCircle } from 'lucide-react';
import { DragItem, Folder } from '../types';
import { friendlyError, getFolderPath, getSubtreeIds, hasNameConflict } from '../lib/folders';
import { cn } from '../lib/utils';
import Modal from './Modal';

interface MoveDialogProps {
  item: DragItem;
  itemName: string;
  /** Folder that currently contains the item (null = root). */
  currentParentId: string | null;
  folders: Folder[];
  onClose: () => void;
  onMove: (targetId: string | null) => Promise<void>;
}

export default function MoveDialog({ item, itemName, currentParentId, folders, onClose, onMove }: MoveDialogProps) {
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(getFolderPath(folders, currentParentId).map((f) => f.id))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = useMemo(
    () => (item.type === 'folder' ? getSubtreeIds(folders, item.id) : new Set<string>()),
    [folders, item]
  );
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const list = map.get(f.parent_id) ?? [];
      list.push(f);
      map.set(f.parent_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  const canSubmit = selected !== undefined && selected !== currentParentId && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    const target = selected ?? null;
    if (item.type === 'folder' && hasNameConflict(folders, target, itemName, item.id)) {
      setError('Đã có folder cùng tên ở vị trí này');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onMove(target);
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const renderRow = (id: string | null, name: string, depth: number) => {
    const isBlocked = id !== null && blocked.has(id);
    const isCurrent = id === currentParentId;
    const children = childrenOf.get(id) ?? [];
    const hasChildren = id !== null && children.length > 0;
    const isOpen = id === null || expanded.has(id);
    const isSelected = selected === id;

    return (
      <li key={id ?? 'root'}>
        <div
          className={cn(
            'flex items-center gap-1 border-2 py-1.5 pr-3',
            isSelected ? 'border-ink bg-ink text-surface' : 'border-transparent',
            !isSelected && !isBlocked && 'hover:bg-gray-100',
            isBlocked && 'opacity-40'
          )}
          style={{ paddingLeft: 8 + depth * 18 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(id!)}
              aria-label={isOpen ? `Thu gọn ${name}` : `Mở rộng ${name}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center cursor-pointer"
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <button
            type="button"
            disabled={isBlocked}
            onClick={() => { setSelected(id); setError(null); }}
            onDoubleClick={() => hasChildren && toggle(id!)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-black uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
          >
            {id === null ? <Home size={14} className="shrink-0" /> : <FolderIcon size={14} className="shrink-0" />}
            <span className="truncate">{name}</span>
            {isCurrent && (
              <span className={cn('ml-auto shrink-0 font-mono text-[9px] font-bold', isSelected ? 'text-surface/70' : 'text-bold-muted')}>
                VỊ TRÍ HIỆN TẠI
              </span>
            )}
          </button>
        </div>
        {isOpen && children.length > 0 && (
          <ul>{children.map((child) => renderRow(child.id, child.name, depth + 1))}</ul>
        )}
      </li>
    );
  };

  return (
    <Modal title="Di chuyển tới…" onClose={onClose}>
      <p className="-mt-3 font-mono text-xs text-bold-muted">
        Chọn nơi chuyển <span className="font-bold text-ink">{itemName}</span> tới.
      </p>

      <ul className="flex-[1_1_240px] min-h-[120px] overflow-y-auto border-2 border-bold-border p-1">
        {renderRow(null, 'Home', 0)}
      </ul>

      {error && (
        <div role="alert" className="flex items-center gap-2 border-2 border-red-600 bg-red-50 p-3 font-mono text-[11px] font-bold uppercase text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 border-2 border-bold-border py-3 text-xs font-black uppercase tracking-wider hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex flex-1 items-center justify-center gap-2 border-2 border-bold-border bg-ink py-3 text-xs font-black uppercase tracking-wider text-surface hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Di chuyển
        </button>
      </div>
    </Modal>
  );
}
