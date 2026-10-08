import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder as FolderIcon, Home, AlertCircle } from 'lucide-react';
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
            'flex items-center gap-1 rounded-field border py-1.5 pr-3',
            isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-transparent',
            !isSelected && !isBlocked && 'hover:bg-base-200',
            isBlocked && 'opacity-40'
          )}
          style={{ paddingLeft: 8 + depth * 18 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(id!)}
              aria-label={isOpen ? `Thu gọn ${name}` : `Mở rộng ${name}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-base-content/60 hover:bg-base-300 cursor-pointer"
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
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {id === null ? <Home size={14} className="shrink-0" /> : <FolderIcon size={14} className="shrink-0" />}
            <span className="truncate">{name}</span>
            {isCurrent && (
              <span className="badge badge-ghost badge-sm ml-auto shrink-0">
                Vị trí hiện tại
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
      <p className="-mt-2 text-sm text-base-content/70">
        Chọn nơi chuyển <span className="font-semibold text-base-content">{itemName}</span> tới.
      </p>

      <ul className="flex-[1_1_240px] min-h-[120px] overflow-y-auto rounded-box border border-base-300 p-1">
        {renderRow(null, 'Home', 0)}
      </ul>

      {error && (
        <div role="alert" className="alert alert-error alert-soft py-2 text-sm">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="modal-action mt-0">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="btn btn-ghost"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-primary"
        >
          {saving && <span className="loading loading-spinner loading-xs" />}
          Di chuyển
        </button>
      </div>
    </Modal>
  );
}
