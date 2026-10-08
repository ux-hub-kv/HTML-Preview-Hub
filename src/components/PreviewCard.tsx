import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, FileCode2, Folder as FolderIcon, FolderInput, Trash2 } from 'lucide-react';
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
    <span className={cn('badge badge-sm badge-soft gap-1', urgent ? 'badge-error' : 'badge-ghost')}>
      <Clock size={10} />
      Còn {daysLeft} ngày
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
        'group relative flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        isDragging && 'opacity-40'
      )}
    >
      <Link to={`/preview/${preview.id}`} draggable={false} className="absolute inset-0 z-0 rounded-box" aria-label={`Xem ${preview.title}`} />

      {confirmDelete && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-box border border-error/40 bg-base-100 p-5 text-center">
          <p className="text-sm font-semibold">Xóa file này?</p>
          <p className="text-xs text-base-content/60">File được giữ thêm {TRASH_RETENTION_DAYS} ngày trước khi bị xóa vĩnh viễn.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="btn btn-sm btn-ghost"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete?.(preview.id); }}
              className="btn btn-sm btn-error"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-secondary/10 text-secondary">
          <FileCode2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {preview.title}
          </h3>
          {pathLabel && (
            <p className="mt-1 flex items-center gap-1 text-xs text-base-content/60">
              <FolderIcon size={12} className="shrink-0" />
              <span className="truncate">{pathLabel}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-base-200 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs text-base-content/60">Cập nhật {formatDate(preview.updated_at)}</span>
          <ExpiryBadge expiresAt={preview.expires_at} />
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
