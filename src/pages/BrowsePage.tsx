import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Upload, AlertCircle, FolderPlus, X } from 'lucide-react';
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
      setError('PLEASE_UPLOAD_VALID_HTML');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('FILE_EXCEEDS_2MB_LIMIT');
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
      setError(err.message || 'SYSTEM_ERROR_OCCURRED');
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
      <div className="mx-auto max-w-xl py-20 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black uppercase text-ink">Folder không tồn tại</h1>
        <p className="mt-2 font-mono text-xs text-bold-muted">Folder có thể đã bị xóa hoặc link không đúng.</p>
        <Link to="/" className="mt-8 inline-block font-black uppercase text-ink underline underline-offset-4">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b-2 border-bold-border bg-surface px-10 py-10">
        <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tighter text-ink">
          HTML Previews
        </h1>
      </header>

      <div className="flex min-h-[62px] flex-wrap items-center border-b-2 border-bold-border bg-surface px-10 py-4">
        {searching ? (
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
            Kết quả tìm kiếm cho "{search.trim()}" trong toàn bộ folder
          </p>
        ) : (
          <Breadcrumb path={path} canDropOn={canDropOn} onDropOn={dropOn} />
        )}
      </div>

      {!searching && (
        <div className="p-10 pb-0">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'group relative flex h-[240px] flex-col items-center justify-center border-2 border-dashed border-bold-border transition-all mb-8 bg-surface hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] cursor-pointer',
              dragActive
                ? 'border-solid border-ink bg-gray-50'
                : ''
            )}
          >
            <input
              type="file"
              accept=".html"
              onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                 <Loader2 className="animate-spin text-ink mb-3" size={32} />
                 <p className="text-sm font-black uppercase tracking-widest text-ink">Uploading...</p>
              </div>
            ) : (
               <div className="flex flex-col items-center text-center mt-2">
                <div className="mb-4 border-2 border-bold-border p-3 text-ink bg-white">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-black uppercase tracking-widest text-ink">
                  Drag_drop_source_file or Click to Upload
                </p>
                <p className="mt-2 font-mono text-[10px] font-bold uppercase text-bold-muted">
                  {currentFolder ? `Upload vào folder: ${currentFolder.name}` : 'Upload vào: Home'} | .HTML ONLY | SIZE_LIMIT: 2MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn('px-10', searching && 'pt-10')}>
        {/* Toolbar for the listing below: search across all folders + create a folder here */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bold-muted" size={16} />
            <input
              type="text"
              placeholder="Tìm file hoặc folder"
              aria-label="Tìm file hoặc folder"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              className="w-full border-2 border-bold-border bg-surface py-3 pl-10 pr-9 text-xs font-bold uppercase tracking-wider focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-bold-muted hover:text-ink cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {!searching && !foldersUnavailable && (
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              disabled={creatingFolder}
              className="flex items-center gap-2 border-2 border-bold-border bg-surface px-4 py-3 text-xs font-black uppercase tracking-wider text-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FolderPlus size={14} />
              Folder mới
            </button>
          )}
        </div>

        {foldersUnavailable && (
          <div className="mb-8 flex items-center gap-3 border-2 border-amber-500 bg-amber-50 p-6 font-mono text-xs font-bold uppercase text-amber-800">
            <AlertCircle size={20} />
            <span>Chưa bật tính năng folder: hãy chạy SQL ở phần A trong SUPABASE_SETUP.md.</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-8 flex items-center gap-3 border-2 border-red-600 bg-red-50 p-6 font-mono text-xs font-bold uppercase text-red-600">
            <AlertCircle size={20} />
            <span className="flex-1">Error_Code: {error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Đóng" className="cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="px-10 pb-10">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-ink" size={32} />
          </div>
        ) : shownFolders.length === 0 && shownPreviews.length === 0 && !creatingFolder ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-bold-border bg-white py-24 text-center">
            <h3 className="text-xl font-black uppercase text-ink">
              {searching ? 'Không tìm thấy' : currentFolder ? 'Folder trống' : 'List Empty'}
            </h3>
            <p className="mt-1 font-mono text-xs font-bold uppercase text-bold-muted">
              {searching
                ? 'Không có file hay folder nào khớp.'
                : currentFolder
                  ? 'Upload file ở trên, hoặc dùng "Di chuyển tới…" để đưa file vào đây.'
                  : 'Chưa có file nào được tải lên.'}
            </p>
          </div>
        ) : (
          <>
            {(shownFolders.length > 0 || creatingFolder) && (
              <section className="mb-10">
                <h2 className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted">
                  Folder
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <h2 className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bold-muted">
                  Các file đã tải lên
                </h2>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
          </>
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
