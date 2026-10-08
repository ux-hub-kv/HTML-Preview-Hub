import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Upload, AlertCircle, FolderPlus, FolderOpen, FileCode2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DragItem, Folder, HtmlPreview } from '../types';
import PreviewCard from '../components/PreviewCard';
import FolderCard, { NewFolderCard } from '../components/FolderCard';
import Breadcrumb, { folderUrl } from '../components/Breadcrumb';
import MoveDialog from '../components/MoveDialog';
import DeleteFolderDialog from '../components/DeleteFolderDialog';
import { cn } from '../lib/utils';
import { EXPIRY_ENABLED } from '../lib/config';
import { useTrashPreview } from '../lib/useTrashPreview';
import {
  canMoveTo,
  createFolder,
  deleteFolder,
  fetchFolders,
  friendlyError,
  DATA_CHANGED_EVENT,
  getCurrentAuthor,
  getFolderPath,
  getSubtreeIds,
  hasNameConflict,
  isVisible,
  moveItem,
  renameFolder,
} from '../lib/folders';

export default function BrowsePage() {
  const { folderId } = useParams();
  const currentFolderId = folderId ?? null;
  const [previews, setPreviews] = useState<HtmlPreview[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersUnavailable, setFoldersUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DragItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);
  const navigate = useNavigate();
  const trashPreview = useTrashPreview();

  const reload = useCallback(async () => {
    const [previewResult, folderResult] = await Promise.allSettled([
      supabase.from('html_previews').select('*').order('updated_at', { ascending: false }),
      fetchFolders(),
    ]);
    if (previewResult.status === 'fulfilled' && !previewResult.value.error && previewResult.value.data) {
      setPreviews(previewResult.value.data);
    }
    if (folderResult.status === 'fulfilled') {
      setFolders(folderResult.value);
      setFoldersUnavailable(false);
    } else {
      setFoldersUnavailable(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    // e.g. "Hoàn tác" in the delete toast restored a preview
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
  }, [reload]);

  // Leaving a folder resets the transient UI
  useEffect(() => {
    setCreatingFolder(false);
    setSearch('');
    setError(null);
    window.scrollTo(0, 0);
  }, [currentFolderId]);

  const now = new Date();
  const visiblePreviews = previews.filter((p) => isVisible(p, now));
  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;
  const path = useMemo(() => getFolderPath(folders, currentFolderId), [folders, currentFolderId]);
  const pathLabelOf = (id: string | null) =>
    ['Home', ...getFolderPath(folders, id).map((f) => f.name)].join(' / ');

  const childFolders = folders
    .filter((f) => f.parent_id === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childPreviews = visiblePreviews.filter((p) => (p.folder_id ?? null) === currentFolderId);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;
  const matchedFolders = searching ? folders.filter((f) => f.name.toLowerCase().includes(query)) : [];
  const matchedPreviews = searching
    ? visiblePreviews.filter(
        (p) => p.title.toLowerCase().includes(query) || !!p.author?.toLowerCase().includes(query)
      )
    : [];

  const shownFolders = searching ? matchedFolders : childFolders;
  const shownPreviews = searching ? matchedPreviews : childPreviews;

  const countsOf = (folder: Folder) => ({
    folderCount: folders.filter((f) => f.parent_id === folder.id).length,
    fileCount: visiblePreviews.filter((p) => p.folder_id === folder.id).length,
  });

  // ---------- actions ----------

  const handleUpload = async (file: File) => {
    if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
      setError('Chỉ hỗ trợ file .html. Hãy chọn file khác.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File lớn hơn 2MB. Hãy chọn file nhỏ hơn.');
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const fileId = crypto.randomUUID();
      const filePath = `${fileId}.html`;

      const { error: storageError } = await supabase.storage
        .from('previews')
        .upload(filePath, file, { contentType: 'text/html' });

      if (storageError) throw storageError;

      const nameWithoutExt = file.name.replace(/\.html?$/i, '');
      const expiresAt = EXPIRY_ENABLED ? new Date(Date.now() + 14 * 86400000).toISOString() : null;

      const { data: dbData, error: dbError } = await supabase
        .from('html_previews')
        .insert({
          title: nameWithoutExt,
          author: getCurrentAuthor(),
          file_path: filePath,
          expires_at: expiresAt,
          ...(currentFolderId ? { folder_id: currentFolderId } : {}),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      navigate(`/preview/${dbData.id}`);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra. Hãy thử lại.');
      setUploading(false);
    }
  };

  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');

  const handleDrag = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    const preview = previews.find((p) => p.id === id);
    if (!preview) return;
    try {
      await trashPreview(preview);
      setPreviews((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (hasNameConflict(folders, currentFolderId, name)) {
      throw new Error('Đã có folder cùng tên ở vị trí này');
    }
    await createFolder(name, currentFolderId);
    await reload();
    setCreatingFolder(false);
  };

  const handleRename = async (folder: Folder, name: string) => {
    if (hasNameConflict(folders, folder.parent_id, name, folder.id)) {
      throw new Error('Đã có folder cùng tên ở vị trí này');
    }
    await renameFolder(folder.id, name);
    await reload();
  };

  const handleMove = async (item: DragItem, targetId: string | null) => {
    await moveItem(item, targetId);
    await reload();
  };

  const canDropOn = (targetId: string | null) =>
    !!dragItem && canMoveTo(dragItem, targetId, folders, previews);

  const dropOn = async (targetId: string | null) => {
    const item = dragItem;
    setDragItem(null);
    if (!item || !canMoveTo(item, targetId, folders, previews)) return;
    if (item.type === 'folder') {
      const folder = folders.find((f) => f.id === item.id)!;
      if (hasNameConflict(folders, targetId, folder.name, folder.id)) {
        setError(`Đã có folder tên "${folder.name}" ở "${pathLabelOf(targetId)}"`);
        return;
      }
    }
    setError(null);
    try {
      await handleMove(item, targetId);
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const handleDeleteFolder = async (folder: Folder, mode: 'ungroup' | 'all') => {
    // If the folder being viewed disappears, step back to the deleted folder's parent
    const viewingRemoved =
      currentFolderId !== null &&
      (currentFolderId === folder.id || (mode === 'all' && getSubtreeIds(folders, folder.id).has(currentFolderId)));
    await deleteFolder(folder.id, mode);
    setDeleteTarget(null);
    if (viewingRemoved) navigate(folderUrl(folder.parent_id));
    await reload();
  };

  const moveItemName =
    moveTarget?.type === 'folder'
      ? folders.find((f) => f.id === moveTarget.id)?.name ?? ''
      : previews.find((p) => p.id === moveTarget?.id)?.title ?? '';
  const moveItemParent =
    moveTarget?.type === 'folder'
      ? folders.find((f) => f.id === moveTarget.id)?.parent_id ?? null
      : previews.find((p) => p.id === moveTarget?.id)?.folder_id ?? null;

  // ---------- render ----------

  if (!loading && currentFolderId && !currentFolder) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-error" />
        <h1 className="text-xl font-semibold">Không tìm thấy folder</h1>
        <p className="mt-2 text-sm text-base-content/60">Folder có thể đã bị xóa hoặc link không đúng.</p>
        <Link to="/" className="btn btn-primary btn-sm mt-6">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content">
          <FileCode2 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">HTML Preview Hub</h1>
          <p className="text-sm text-base-content/60">Chia sẻ và xem nhanh các file HTML</p>
        </div>
      </header>

      <div className="flex min-h-9 flex-wrap items-center">
        {searching ? (
          <p className="text-sm text-base-content/70">
            Kết quả tìm kiếm cho <span className="font-medium text-base-content">"{search.trim()}"</span> trong tất cả folder
          </p>
        ) : (
          <Breadcrumb path={path} canDropOn={canDropOn} onDropOn={dropOn} />
        )}
      </div>

      {!searching && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-44 flex-col items-center justify-center rounded-box border-2 border-dashed bg-base-100 transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-base-content/20 hover:border-primary/60'
          )}
        >
          <input
            type="file"
            accept=".html"
            onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading}
            aria-label="Chọn file HTML để tải lên"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="text-sm font-medium">Đang tải lên…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium">
                Kéo thả file vào đây hoặc <span className="text-primary">chọn file</span>
              </p>
              <p className="mt-1 text-xs text-base-content/60">
                Tải vào {currentFolder ? `folder "${currentFolder.name}"` : 'Home'} · Chỉ file .html, tối đa 2MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toolbar for the listing below: search across all folders + create a folder here */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="input w-full sm:w-80">
          <Search size={16} className="text-base-content/50" />
          <input
            type="search"
            placeholder="Tìm file hoặc folder"
            aria-label="Tìm file hoặc folder"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
          />
        </label>
        {!searching && !foldersUnavailable && (
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            disabled={creatingFolder}
            className="btn btn-primary"
          >
            <FolderPlus size={16} />
            Folder mới
          </button>
        )}
      </div>

      {foldersUnavailable && (
        <div role="alert" className="alert alert-warning alert-soft text-base-content">
          <AlertCircle size={18} />
          <span>Tính năng folder chưa được bật. Hãy chạy SQL ở phần A trong SUPABASE_SETUP.md.</span>
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <AlertCircle size={18} />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Đóng" className="btn btn-ghost btn-circle btn-xs">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="pb-10">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : shownFolders.length === 0 && shownPreviews.length === 0 && !creatingFolder ? (
          <div className="flex flex-col items-center justify-center rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-200 text-base-content/50">
              {searching ? <Search size={20} /> : <FolderOpen size={20} />}
            </div>
            <h3 className="font-semibold">
              {searching ? 'Không tìm thấy kết quả' : currentFolder ? 'Folder này đang trống' : 'Chưa có file nào'}
            </h3>
            <p className="mt-1 text-sm text-base-content/60">
              {searching
                ? 'Thử tìm bằng từ khóa khác.'
                : currentFolder
                  ? 'Tải file lên ở trên, hoặc dùng "Di chuyển tới…" để đưa file vào đây.'
                  : 'Tải file HTML đầu tiên lên ở khung phía trên.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {(shownFolders.length > 0 || creatingFolder) && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-base-content/60">Folder</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {creatingFolder && (
                    <NewFolderCard onSubmit={handleCreateFolder} onCancel={() => setCreatingFolder(false)} />
                  )}
                  {shownFolders.map((folder) => {
                    const { folderCount, fileCount } = countsOf(folder);
                    return (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        folderCount={folderCount}
                        fileCount={fileCount}
                        pathLabel={searching ? pathLabelOf(folder.parent_id) : undefined}
                        isDragging={dragItem?.id === folder.id}
                        canDrop={canDropOn(folder.id)}
                        onDropItem={() => dropOn(folder.id)}
                        onDragStart={() => setDragItem({ type: 'folder', id: folder.id })}
                        onDragEnd={() => setDragItem(null)}
                        onRename={(name) => handleRename(folder, name)}
                        onMove={() => setMoveTarget({ type: 'folder', id: folder.id })}
                        onDelete={() => setDeleteTarget(folder)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {shownPreviews.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-base-content/60">File</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shownPreviews.map((preview) => (
                    <PreviewCard
                      key={preview.id}
                      preview={preview}
                      onDelete={handleDelete}
                      onMove={foldersUnavailable ? undefined : () => setMoveTarget({ type: 'file', id: preview.id })}
                      pathLabel={searching ? pathLabelOf(preview.folder_id ?? null) : undefined}
                      isDragging={dragItem?.id === preview.id}
                      onDragStart={foldersUnavailable ? undefined : () => setDragItem({ type: 'file', id: preview.id })}
                      onDragEnd={() => setDragItem(null)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {moveTarget && (
        <MoveDialog
          item={moveTarget}
          itemName={moveItemName}
          currentParentId={moveItemParent}
          folders={folders}
          onClose={() => setMoveTarget(null)}
          onMove={async (targetId) => {
            await handleMove(moveTarget, targetId);
            setMoveTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteFolderDialog
          folder={deleteTarget}
          folders={folders}
          previews={previews}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(mode) => handleDeleteFolder(deleteTarget, mode)}
        />
      )}
    </div>
  );
}
