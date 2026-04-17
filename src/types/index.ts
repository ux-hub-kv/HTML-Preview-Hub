export interface HtmlPreview {
  id: string;
  title: string;
  author: string | null;
  file_path: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface UploadMetadata {
  title: string;
  author: string;
}
