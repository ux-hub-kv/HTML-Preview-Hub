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
        'group relative flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 transition-all hover:border-primary/40 hover:shadow-md',
        isDragging && 'opacity-40',
        isOver && 'border-primary bg-primary/5 ring-2 ring-primary/30'
      )}
    >
      {!editing && (
        <Link
          to={`/folder/${folder.id}`}
          draggable={false}
          className="absolute inset-0 z-0 rounded-box"
          aria-label={`Mở folder ${folder.name}`}
        />
      )}

      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-field transition-colors',
          isOver ? 'bg-primary text-primary-content' : 'bg-primary/10 text-primary'
        )}
      >
        <FolderIcon size={20} />
      </div>

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
            <h3 className="truncate text-sm font-semibold group-hover:text-primary">{folder.name}</h3>
            <p className="mt-0.5 truncate text-xs text-base-content/60">
              {isOver ? 'Thả vào đây để chuyển' : pathLabel ?? summary}
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
    <div className="flex items-center gap-3 rounded-box border border-dashed border-primary/60 bg-base-100 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-primary/10 text-primary">
        <FolderIcon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <FolderNameInput initialValue="Folder mới" onSubmit={onSubmit} onCancel={onCancel} />
      </div>
    </div>
  );
}
