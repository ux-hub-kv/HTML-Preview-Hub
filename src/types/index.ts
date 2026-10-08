export interface HtmlPreview {
  id: string;
  title: string;
  author: string | null;
  file_path: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export type DragItem = { type: 'file' | 'folder'; id: string };

export interface UploadMetadata {
  title: string;
  author: string;
}
