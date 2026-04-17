import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import { HtmlPreview } from '../types';
import { formatDate } from '../lib/utils';
import { differenceInDays } from 'date-fns';

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const daysLeft = differenceInDays(new Date(expiresAt), new Date());
  const urgent = daysLeft <= 3;
  return (
    <span className={`flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider ${urgent ? 'text-red-500' : 'text-bold-muted'}`}>
      <Clock size={10} />
      {daysLeft}d left
    </span>
  );
}

export default function PreviewCard({ preview, onDelete }: { preview: HtmlPreview; onDelete?: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative flex flex-col border-2 border-bold-border bg-surface p-6 transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] cursor-pointer">
      <Link to={`/preview/${preview.id}`} className="absolute inset-0 z-0" aria-label={`View ${preview.title}`} />

      {confirmDelete && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 border-2 border-red-500 bg-surface p-6">
          <p className="text-center font-mono text-xs font-bold uppercase tracking-wider text-ink">Xóa preview này?</p>
          <p className="text-center font-mono text-[10px] uppercase text-bold-muted">Hành động này không thể hoàn tác.</p>
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="border-2 border-bold-border px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(preview.id); }}
              className="border-2 border-red-500 bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-red-600"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-1 flex-col">
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
        <h3 className="line-clamp-1 text-xl font-black uppercase tracking-tight text-ink group-hover:text-bold-accent">
          {preview.title}
        </h3>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-6">
        <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink">
          <div className="flex items-center gap-1.5">
            <span className="text-bold-muted">AUTH:</span>
            <span className="truncate max-w-[80px]">{preview.author || 'ANON'}</span>
          </div>
          <div className="flex items-center gap-1.5">
             <span className="text-bold-muted">DATE:</span>
            <span>{formatDate(preview.updated_at)}</span>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
            className="relative z-10 p-1.5 text-bold-muted transition-colors hover:text-red-500"
            title="Xóa preview"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
