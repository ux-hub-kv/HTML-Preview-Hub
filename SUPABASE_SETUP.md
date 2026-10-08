# Supabase Setup Guide

Chọn **một** trong hai trường hợp:

- **Project Supabase đang chạy bản cũ** → chỉ chạy các phần nâng cấp còn thiếu, theo thứ tự: [A. Folder](#a-nâng-cấp-thêm-tính-năng-folder) → [C. Thùng rác](#c-nâng-cấp-thùng-rác-giữ-file-đã-xóa-30-ngày). Không chạy phần B.
- **Project Supabase mới tinh** → làm phần [B. Setup từ đầu](#b-setup-từ-đầu), sau đó chạy phần A rồi phần C.

---

## A. Nâng cấp: thêm tính năng Folder

Mở **SQL Editor**, dán toàn bộ đoạn dưới đây và bấm **Run** một lần.

- Chỉ **thêm** bảng `folders`, cột `folder_id`, trigger, hàm và policy mới. Không sửa hay xóa dữ liệu cũ; mọi file hiện có sẽ nằm ở **Home**.
- Có thể chạy lại nhiều lần mà không lỗi (dùng `IF NOT EXISTS` / `CREATE OR REPLACE`).

```sql
-- Folders table (nested via parent_id)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Folder names are unique (case-insensitive) within the same parent
CREATE UNIQUE INDEX IF NOT EXISTS folders_unique_name_per_parent
  ON folders (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)));
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON folders (parent_id);

-- Previews belong to a folder (NULL = root)
ALTER TABLE html_previews
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS html_previews_folder_id_idx ON html_previews (folder_id);

-- Block moving a folder into itself or one of its descendants
CREATE OR REPLACE FUNCTION folders_prevent_cycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM folders WHERE id = NEW.parent_id
      UNION
      SELECT f.id, f.parent_id FROM folders f JOIN ancestors a ON f.id = a.parent_id
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'FOLDER_CYCLE';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER folders_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON folders
  FOR EACH ROW EXECUTE FUNCTION folders_prevent_cycle();

-- Delete a folder in one transaction.
--   mode 'ungroup': move its files and subfolders up to its parent, then delete it
--                   (subfolders whose name clashes in the parent get a " (2)" suffix)
--   mode 'all':     delete the whole subtree and its previews; returns the storage
--                   paths so the client can remove the HTML files from the bucket
CREATE OR REPLACE FUNCTION delete_folder(p_folder_id UUID, p_mode TEXT)
RETURNS TABLE (removed_path TEXT)
LANGUAGE plpgsql AS $$
DECLARE
  v_parent UUID;
  v_name TEXT;
  v_n INT;
  r RECORD;
BEGIN
  SELECT parent_id INTO v_parent FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FOLDER_NOT_FOUND';
  END IF;

  IF p_mode = 'ungroup' THEN
    -- Free up the folder's own name so a child with the same name can take its place
    UPDATE folders SET name = '__deleting_' || id::text WHERE id = p_folder_id;
    UPDATE html_previews SET folder_id = v_parent WHERE folder_id = p_folder_id;
    FOR r IN SELECT id, name FROM folders WHERE parent_id = p_folder_id LOOP
      v_name := r.name;
      v_n := 2;
      WHILE EXISTS (
        SELECT 1 FROM folders
        WHERE parent_id IS NOT DISTINCT FROM v_parent
          AND lower(trim(name)) = lower(trim(v_name))
          AND id <> r.id
      ) LOOP
        v_name := r.name || ' (' || v_n || ')';
        v_n := v_n + 1;
      END LOOP;
      UPDATE folders SET parent_id = v_parent, name = v_name, updated_at = now() WHERE id = r.id;
    END LOOP;
    DELETE FROM folders WHERE id = p_folder_id;
  ELSIF p_mode = 'all' THEN
    RETURN QUERY
      WITH RECURSIVE tree AS (
        SELECT f.id FROM folders f WHERE f.id = p_folder_id
        UNION
        SELECT f.id FROM folders f JOIN tree t ON f.parent_id = t.id
      ), removed AS (
        DELETE FROM html_previews hp
        WHERE hp.folder_id IN (SELECT tree.id FROM tree)
        RETURNING hp.file_path
      )
      SELECT removed.file_path FROM removed;
    DELETE FROM folders WHERE id = p_folder_id; -- subfolders cascade
  ELSE
    RAISE EXCEPTION 'INVALID_MODE';
  END IF;
END $$;

-- RLS: same open access model as html_previews
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'folders') THEN
    CREATE POLICY "Public Read Access" ON folders FOR SELECT USING (true);
    CREATE POLICY "Public Insert Access" ON folders FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public Update Access" ON folders FOR UPDATE USING (true);
    CREATE POLICY "Public Delete Access" ON folders FOR DELETE USING (true);
  END IF;
END $$;

-- "Xóa folder và toàn bộ nội dung" cần quyền DELETE trên html_previews.
-- Chỉ tạo policy nếu project chưa có policy DELETE nào cho bảng này.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'html_previews' AND cmd IN ('DELETE', 'ALL')
  ) THEN
    CREATE POLICY "Public Delete Access" ON html_previews FOR DELETE USING (true);
  END IF;
END $$;
```

Kiểm tra sau khi chạy: vào **Table Editor** thấy bảng `folders`, và bảng `html_previews` có thêm cột `folder_id`.

---

## C. Nâng cấp: Thùng rác (giữ file đã xóa 30 ngày)

Chạy **sau phần A**. Mở **SQL Editor**, dán toàn bộ đoạn dưới đây và bấm **Run** một lần.

- Chỉ **thêm** cột `deleted_at`, cập nhật hàm `delete_folder` (chế độ "Xóa toàn bộ" chuyển file vào thùng rác thay vì xóa hẳn) và thêm quyền Delete cho bucket `previews` nếu chưa có — cần để app tự dọn file quá 30 ngày.
- Không có `DROP`, không sửa hay xóa dữ liệu cũ. Có thể chạy lại nhiều lần.

```sql
-- Soft delete: a deleted preview keeps its row and HTML file for 30 days, then the app purges it
ALTER TABLE html_previews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS html_previews_deleted_at_idx
  ON html_previews (deleted_at) WHERE deleted_at IS NOT NULL;

-- Same signature as before; mode 'all' now trashes the previews instead of deleting them
CREATE OR REPLACE FUNCTION delete_folder(p_folder_id UUID, p_mode TEXT)
RETURNS TABLE (removed_path TEXT)
LANGUAGE plpgsql AS $$
DECLARE
  v_parent UUID;
  v_name TEXT;
  v_n INT;
  r RECORD;
BEGIN
  SELECT parent_id INTO v_parent FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FOLDER_NOT_FOUND';
  END IF;

  IF p_mode = 'ungroup' THEN
    -- Free up the folder's own name so a child with the same name can take its place
    UPDATE folders SET name = '__deleting_' || id::text WHERE id = p_folder_id;
    UPDATE html_previews SET folder_id = v_parent WHERE folder_id = p_folder_id;
    FOR r IN SELECT id, name FROM folders WHERE parent_id = p_folder_id LOOP
      v_name := r.name;
      v_n := 2;
      WHILE EXISTS (
        SELECT 1 FROM folders
        WHERE parent_id IS NOT DISTINCT FROM v_parent
          AND lower(trim(name)) = lower(trim(v_name))
          AND id <> r.id
      ) LOOP
        v_name := r.name || ' (' || v_n || ')';
        v_n := v_n + 1;
      END LOOP;
      UPDATE folders SET parent_id = v_parent, name = v_name, updated_at = now() WHERE id = r.id;
    END LOOP;
    DELETE FROM folders WHERE id = p_folder_id;
  ELSIF p_mode = 'all' THEN
    WITH RECURSIVE tree AS (
      SELECT f.id FROM folders f WHERE f.id = p_folder_id
      UNION
      SELECT f.id FROM folders f JOIN tree t ON f.parent_id = t.id
    )
    UPDATE html_previews hp
    SET deleted_at = now()
    WHERE hp.folder_id IN (SELECT tree.id FROM tree) AND hp.deleted_at IS NULL;
    -- Subfolders cascade; previews already in the trash fall back to folder_id NULL (Home)
    DELETE FROM folders WHERE id = p_folder_id;
  ELSE
    RAISE EXCEPTION 'INVALID_MODE';
  END IF;
END $$;

-- The app purges trashed files older than 30 days from the bucket, which needs DELETE on storage objects.
-- Only added when no DELETE policy covering the previews bucket exists yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('DELETE', 'ALL')
      AND (qual IS NULL OR qual = 'true' OR qual LIKE '%previews%')
  ) THEN
    CREATE POLICY "Public Delete previews" ON storage.objects FOR DELETE USING (bucket_id = 'previews');
  END IF;
END $$;
```

Kiểm tra sau khi chạy: bảng `html_previews` có thêm cột `deleted_at`.

---

## B. Setup từ đầu

Chỉ dành cho project Supabase **chưa có** bảng `html_previews`.

### 1. Tạo bảng

```sql
CREATE TABLE html_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  file_path TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE html_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access" ON html_previews FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON html_previews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON html_previews FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON html_previews FOR DELETE USING (true);
```

### 2. Tạo Storage bucket
1. Vào **Storage** trong Supabase Dashboard.
2. Tạo bucket tên `previews`.
3. Để **Public** (hoặc cấu hình policy cho phép đọc công khai).
4. Policy cho bucket `previews`: cho phép Read, Insert, Update, Delete.

### 3. Thêm tính năng Folder
Chạy đoạn SQL ở [phần A](#a-nâng-cấp-thêm-tính-năng-folder), rồi [phần C](#c-nâng-cấp-thùng-rác-giữ-file-đã-xóa-30-ngày).

---

## Biến môi trường

Tạo file `.env.local` (chạy local) hoặc thêm vào Secrets/Environment Variables khi deploy:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
