import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Folder as FolderIcon, FolderInput, Trash2 } from 'lucide-react';
import { HtmlPreview } from '../types';
import { cn, formatDate } from '../lib/utils';
import { DRAG_MIME } from '../lib/folders';
import ItemMenu from './ItemMenu';
import { EXPIRY_ENABLED, TRASH_RETENTION_DAYS } from '../lib/config';
import { differenceInDays } from 'date-fns';

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!EXPIRY_ENABLED || !expiresAt) return null;
  const daysLeft = differenceInDays(new Date(expiresAt), new Date());
  const urgent = daysLeft <= 3;
  return (
    <span className={`flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider ${urgent ? 'text-red-500' : 'text-bold-muted'}`}>
      <Clock size={10} />
      {daysLeft}d left
    </span>
  );
}

interface PreviewCardProps {
  preview: HtmlPreview;
  onDelete?: (id: string) => void;
  onMove?: () => void;
  /** Folder path shown under the title (search results). */
  pathLabel?: string;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function PreviewCard({ preview, onDelete, onMove, pathLabel, isDragging, onDragStart, onDragEnd }: PreviewCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      draggable={!!onDragStart && !confirmDelete}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ type: 'file', id: preview.id }));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex flex-col border-2 border-bold-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer',
        isDragging && 'opacity-40'
      )}
    >
      <Link to={`/preview/${preview.id}`} draggable={false} className="absolute inset-0 z-0" aria-label={`View ${preview.title}`} />

      {confirmDelete && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 border-2 border-red-500 bg-surface p-6">
          <p className="text-center font-mono text-xs font-bold uppercase tracking-wider text-ink">Xóa preview này?</p>
          <p className="text-center font-mono text-[10px] uppercase text-bold-muted">File được giữ thêm {TRASH_RETENTION_DAYS} ngày trước khi xóa vĩnh viễn.</p>
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="border-2 border-bold-border px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(preview.id); }}
              className="border-2 border-red-500 bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-red-600 cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-bold-muted">
            HTML Snippet
          </span>
          <div className="flex items-center gap-2">
            <ExpiryBadge expiresAt={preview.expires_at} />
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-green-400" />
            </div>
          </div>
        </div>
        <h3 className="line-clamp-1 text-lg font-black uppercase tracking-tight text-ink group-hover:text-bold-accent">
          {preview.title}
        </h3>
        {pathLabel && (
          <p className="mt-1 flex items-center gap-1 truncate font-mono text-[9px] font-bold uppercase tracking-wider text-bold-muted">
            <FolderIcon size={10} className="shrink-0" />
            <span className="truncate">{pathLabel}</span>
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink">
          <div className="flex items-center gap-1.5">
             <span className="text-bold-muted">DATE:</span>
            <span>{formatDate(preview.updated_at)}</span>
          </div>
        </div>

        {(onMove || onDelete) && (
          <ItemMenu
            label={`Tùy chọn cho ${preview.title}`}
            actions={[
              ...(onMove ? [{ label: 'Di chuyển tới…', icon: <FolderInput size={14} />, onSelect: onMove }] : []),
              ...(onDelete
                ? [{ label: 'Xóa', icon: <Trash2 size={14} />, onSelect: () => setConfirmDelete(true), danger: true }]
                : []),
            ]}
          />
        )}
      </div>
    </div>
  );
}
