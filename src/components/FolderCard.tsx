import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder as FolderIcon, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { Folder } from '../types';
import { DRAG_MIME } from '../lib/folders';
import { useDropZone } from '../lib/useDropZone';
import { cn } from '../lib/utils';
import ItemMenu from './ItemMenu';
import FolderNameInput from './FolderNameInput';

interface FolderCardProps {
  folder: Folder;
  folderCount: number;
  fileCount: number;
  pathLabel?: string;
  isDragging: boolean;
  canDrop: boolean;
  onDropItem: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRename: (name: string) => Promise<void>;
  onMove: () => void;
  onDelete: () => void;
}

export default function FolderCard({
  folder,
  folderCount,
  fileCount,
  pathLabel,
  isDragging,
  canDrop,
  onDropItem,
  onDragStart,
  onDragEnd,
  onRename,
  onMove,
  onDelete,
}: FolderCardProps) {
  const [editing, setEditing] = useState(false);
  const { isOver, dropHandlers } = useDropZone(canDrop, onDropItem);

  const summary = [
    folderCount > 0 && `${folderCount} folder`,
    `${fileCount} file`,
  ].filter(Boolean).join(' · ');

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ type: 'folder', id: folder.id }));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      {...dropHandlers}
      className={cn(
        'group relative flex items-center gap-3 border-2 border-bold-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]',
        isDragging && 'opacity-40',
        isOver && 'border-bold-accent bg-blue-50 -translate-y-1 shadow-[4px_4px_0px_rgba(0,85,255,1)]'
      )}
    >
      {!editing && (
        <Link
          to={`/folder/${folder.id}`}
          draggable={false}
          className="absolute inset-0 z-0"
          aria-label={`Mở folder ${folder.name}`}
        />
      )}

      <FolderIcon
        size={28}
        strokeWidth={2.25}
        className={cn('shrink-0', isOver ? 'text-bold-accent' : 'text-ink')}
        fill={isOver ? 'currentColor' : 'none'}
        fillOpacity={0.15}
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <FolderNameInput
            initialValue={folder.name}
            onCancel={() => setEditing(false)}
            onSubmit={async (name) => {
              if (name !== folder.name) await onRename(name);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <h3 className="truncate text-sm font-black uppercase tracking-tight text-ink group-hover:text-bold-accent">
              {folder.name}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[9px] font-bold uppercase tracking-wider text-bold-muted">
              {isOver ? 'Thả để chuyển vào đây' : pathLabel ?? summary}
            </p>
          </>
        )}
      </div>

      {!editing && (
        <ItemMenu
          label={`Tùy chọn cho folder ${folder.name}`}
          actions={[
            { label: 'Đổi tên', icon: <Pencil size={14} />, onSelect: () => setEditing(true) },
            { label: 'Di chuyển tới…', icon: <FolderInput size={14} />, onSelect: onMove },
            { label: 'Xóa folder', icon: <Trash2 size={14} />, onSelect: onDelete, danger: true },
          ]}
        />
      )}
    </div>
  );
}

/** Placeholder card shown while naming a new folder. */
export function NewFolderCard({ onSubmit, onCancel }: { onSubmit: (name: string) => Promise<void>; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-3 border-2 border-dashed border-bold-border bg-surface p-4">
      <FolderIcon size={28} strokeWidth={2.25} className="shrink-0 text-bold-muted" />
      <div className="min-w-0 flex-1">
        <FolderNameInput initialValue="Folder mới" onSubmit={onSubmit} onCancel={onCancel} />
      </div>
    </div>
  );
}
