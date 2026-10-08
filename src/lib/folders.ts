import { supabase } from './supabase';
import { Folder, HtmlPreview } from '../types';
import { EXPIRY_ENABLED, TRASH_RETENTION_DAYS } from './config';

export const AUTHOR_STORAGE_KEY = 'html-preview-hub-author';
export const DRAG_MIME = 'application/x-preview-hub-item';

export function getCurrentAuthor() {
  return localStorage.getItem(AUTHOR_STORAGE_KEY) || '';
}

export function isExpired(preview: HtmlPreview, now = new Date()) {
  return EXPIRY_ENABLED && !!preview.expires_at && new Date(preview.expires_at) < now;
}

/** Shown in lists: not in the trash and not expired. */
export function isVisible(preview: HtmlPreview, now = new Date()) {
  return !preview.deleted_at && !isExpired(preview, now);
}

/** Event fired when previews change outside the page that shows them (e.g. undo from a toast). */
export const DATA_CHANGED_EVENT = 'hub:data-changed';

/** Moves a preview to the trash; the HTML file stays in the bucket until it is purged. */
export async function trashPreview(id: string) {
  const { error } = await supabase
    .from('html_previews')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Undo a trash. If the preview's folder was deleted meanwhile, it lands in Home (FK sets folder_id to NULL). */
export async function restorePreview(id: string) {
  const { error } = await supabase.from('html_previews').update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

/**
 * Permanently removes previews that have been in the trash longer than the retention period.
 * Runs whenever someone opens the app. DB rows are only deleted for files the bucket actually removed,
 * so a missing storage permission never leaves rows pointing to nothing or files without rows.
 */
export async function purgeOldTrash() {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86400000).toISOString();
  const { data, error } = await supabase
    .from('html_previews')
    .select('id, file_path')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);
  if (error || !data || data.length === 0) return;

  const { data: removed, error: storageError } = await supabase.storage
    .from('previews')
    .remove(data.map((p) => p.file_path));
  if (storageError) return;

  const removedNames = new Set((removed ?? []).map((o) => o.name));
  const ids = data.filter((p) => removedNames.has(p.file_path)).map((p) => p.id);
  if (ids.length > 0) {
    await supabase.from('html_previews').delete().in('id', ids);
  }
}

/** Folders from the root down to `folderId` (inclusive). Empty for the root. */
export function getFolderPath(folders: Folder[], folderId: string | null): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

/** `folderId` plus every folder nested under it. */
export function getSubtreeIds(folders: Folder[], folderId: string): Set<string> {
  const ids = new Set([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

export function hasNameConflict(folders: Folder[], parentId: string | null, name: string, exceptId?: string) {
  const key = name.trim().toLowerCase();
  return folders.some(
    (f) => f.parent_id === parentId && f.id !== exceptId && f.name.trim().toLowerCase() === key
  );
}

/** Whether `item` may be dropped into `targetId` (null = root). */
export function canMoveTo(
  item: { type: 'file' | 'folder'; id: string },
  targetId: string | null,
  folders: Folder[],
  previews: HtmlPreview[]
) {
  if (item.type === 'file') {
    const preview = previews.find((p) => p.id === item.id);
    return !!preview && preview.folder_id !== targetId;
  }
  const folder = folders.find((f) => f.id === item.id);
  if (!folder || folder.parent_id === targetId) return false;
  return targetId === null || !getSubtreeIds(folders, item.id).has(targetId);
}

export function friendlyError(err: any): string {
  const message: string = err?.message || '';
  if (err?.code === '23505') return 'Đã có folder cùng tên ở vị trí này';
  if (message.includes('FOLDER_CYCLE')) return 'Không thể chuyển folder vào chính nó hoặc folder con của nó';
  if (message.includes('FOLDER_NOT_FOUND')) return 'Folder không còn tồn tại';
  if (message.includes('deleted_at')) return 'Chưa bật thùng rác: hãy chạy SQL phần C trong SUPABASE_SETUP.md';
  return message || 'Đã có lỗi xảy ra';
}

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('folders').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(name: string, parentId: string | null) {
  const { error } = await supabase
    .from('folders')
    .insert({ name: name.trim(), parent_id: parentId, author: getCurrentAuthor() });
  if (error) throw error;
}

export async function renameFolder(id: string, name: string) {
  const { error } = await supabase
    .from('folders')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function moveItem(item: { type: 'file' | 'folder'; id: string }, targetId: string | null) {
  const { error } =
    item.type === 'file'
      ? await supabase.from('html_previews').update({ folder_id: targetId }).eq('id', item.id)
      : await supabase
          .from('folders')
          .update({ parent_id: targetId, updated_at: new Date().toISOString() })
          .eq('id', item.id);
  if (error) throw error;
}

/** 'all' moves every preview in the subtree to the trash (they are purged later), then removes the folders. */
export async function deleteFolder(id: string, mode: 'ungroup' | 'all') {
  const { error } = await supabase.rpc('delete_folder', { p_folder_id: id, p_mode: mode });
  if (error) throw error;
}
