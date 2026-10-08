import { useCallback } from 'react';
import { HtmlPreview } from '../types';
import { useToast } from '../components/Toast';
import { TRASH_RETENTION_DAYS } from './config';
import { restorePreview, trashPreview } from './folders';

/** Moves a preview to the trash and offers an undo toast. */
export function useTrashPreview() {
  const toast = useToast();

  return useCallback(
    async (preview: Pick<HtmlPreview, 'id' | 'title'>) => {
      await trashPreview(preview.id);
      toast({
        message: `Đã xóa "${preview.title}"`,
        detail: `File được giữ thêm ${TRASH_RETENTION_DAYS} ngày rồi mới bị xóa vĩnh viễn. Liên hệ quản trị viên nếu cần khôi phục.`,
        action: { label: 'Hoàn tác', onClick: () => restorePreview(preview.id) },
      });
    },
    [toast]
  );
}
