import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Folder, HtmlPreview } from '../types';
import { friendlyError, getCurrentAuthor, getSubtreeIds, isVisible } from '../lib/folders';
import { TRASH_RETENTION_DAYS } from '../lib/config';
import { cn } from '../lib/utils';
import Modal from './Modal';

type Mode = 'ungroup' | 'all';

interface DeleteFolderDialogProps {
  folder: Folder;
  folders: Folder[];
  previews: HtmlPreview[];
  onClose: () => void;
  onConfirm: (mode: Mode) => Promise<void>;
}

export default function DeleteFolderDialog({ folder, folders, previews, onClose, onConfirm }: DeleteFolderDialogProps) {
  const [mode, setMode] = useState<Mode>('ungroup');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const subtree = getSubtreeIds(folders, folder.id);
    const files = previews.filter((p) => p.folder_id && subtree.has(p.folder_id) && isVisible(p));
    const me = getCurrentAuthor().trim().toLowerCase();
    const otherAuthors = [
      ...new Set(
        files
          .map((p) => p.author?.trim() ?? '')
          .filter((a) => a && a.toLowerCase() !== me)
      ),
    ];
    return { folderCount: subtree.size - 1, fileCount: files.length, otherAuthors, knowsMe: !!me };
  }, [folder, folders, previews]);

  const parentName = folders.find((f) => f.id === folder.parent_id)?.name ?? 'Home';
  const isEmpty = stats.folderCount === 0 && stats.fileCount === 0;
  const effectiveMode: Mode = isEmpty ? 'all' : mode;
  const contents = [
    stats.folderCount > 0 && `${stats.folderCount} folder con`,
    stats.fileCount > 0 && `${stats.fileCount} file`,
  ].filter(Boolean).join(' và ');

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(effectiveMode);
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  };

  return (
    <Modal title="Xóa folder?" onClose={() => !deleting && onClose()}>
      {isEmpty ? (
        <p className="-mt-2 text-sm text-base-content/70">
          Folder <span className="font-semibold text-base-content">{folder.name}</span> đang trống và sẽ bị xóa.
        </p>
      ) : (
        <>
          <p className="-mt-2 text-sm text-base-content/70">
            Folder <span className="font-semibold text-base-content">{folder.name}</span> đang chứa{' '}
            <span className="font-semibold text-base-content">{contents}</span>.
          </p>

          {stats.otherAuthors.length > 0 && (
            <div className="alert alert-warning alert-soft items-start py-2 text-sm text-base-content">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                {stats.knowsMe ? 'Có file do người khác đăng' : 'Folder chứa file của'}: {stats.otherAuthors.slice(0, 3).join(', ')}
                {stats.otherAuthors.length > 3 && ` và ${stats.otherAuthors.length - 3} người khác`}.
              </span>
            </div>
          )}

          <div role="radiogroup" aria-label="Cách xóa folder" className="flex flex-col gap-3">
            <ModeOption
              checked={mode === 'ungroup'}
              onSelect={() => setMode('ungroup')}
              title="Chỉ xóa folder, giữ lại nội dung"
              description={`Toàn bộ nội dung được chuyển lên "${parentName}". Link đã chia sẻ vẫn hoạt động.`}
            />
            <ModeOption
              danger
              checked={mode === 'all'}
              onSelect={() => setMode('all')}
              title="Xóa folder và toàn bộ nội dung"
              description={
                stats.fileCount > 0
                  ? `Xóa ${contents}. File được giữ thêm ${TRASH_RETENTION_DAYS} ngày rồi mới bị xóa vĩnh viễn (liên hệ quản trị viên nếu cần khôi phục). Link đã chia sẻ sẽ không mở được nữa.`
                  : `Xóa ${contents}. Không thể hoàn tác.`
              }
            />
          </div>
        </>
      )}

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
          disabled={deleting}
          className="btn btn-ghost"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={deleting}
          className={cn(
            'btn',
            effectiveMode === 'all' ? 'btn-error' : 'btn-primary'
          )}
        >
          {deleting ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={14} />}
          {deleting ? 'Đang xóa...' : effectiveMode === 'all' && !isEmpty ? 'Xóa toàn bộ' : 'Xóa folder'}
        </button>
      </div>
    </Modal>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  description,
  danger,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-box border p-4 text-left transition-colors cursor-pointer',
        checked ? (danger ? 'border-error bg-error/5' : 'border-primary bg-primary/5') : 'border-base-300 hover:border-base-content/30'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
          checked ? (danger ? 'border-error' : 'border-primary') : 'border-base-content/30'
        )}
      >
        {checked && <span className={cn('h-2 w-2 rounded-full', danger ? 'bg-error' : 'bg-primary')} />}
      </span>
      <span className="flex flex-col gap-1">
        <span className={cn('text-sm font-semibold', danger && 'text-error')}>{title}</span>
        <span className="text-xs text-base-content/60">{description}</span>
      </span>
    </button>
  );
}
