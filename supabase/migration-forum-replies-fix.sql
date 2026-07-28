-- ============================================================================
-- Sửa lỗi không bình luận được ở diễn đàn + cho phép đính kèm ảnh
-- Chạy trong Supabase SQL Editor (idempotent, chạy lại nhiều lần vẫn an toàn).
-- ============================================================================

-- ── 1. Nới giới hạn độ dài nội dung trả lời ────────────────────────────────
-- Trình soạn thảo lưu HTML, nên một trả lời ngắn có định dạng vẫn dễ vượt 3000
-- ký tự và bị CHECK chặn -> người dùng thấy "Nội dung không hợp lệ".
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_content_check;
ALTER TABLE forum_replies
  ADD CONSTRAINT forum_replies_content_check
  CHECK (length(content) BETWEEN 1 AND 20000);

-- ── 2. Nới giới hạn nội dung bài đăng cho khớp (ảnh làm HTML dài hơn) ──────
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_content_check;
ALTER TABLE forum_posts
  ADD CONSTRAINT forum_posts_content_check
  CHECK (length(content) BETWEEN 1 AND 200000);

-- ── 3. Trả reply_count về đúng khi ẩn/xóa trả lời ─────────────────────────
CREATE OR REPLACE FUNCTION decrement_forum_reply_count(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE forum_posts
     SET reply_count = GREATEST(reply_count - 1, 0)
   WHERE id = p_post_id;
END;
$$;

-- Cũng giảm khi bản ghi bị xóa cứng
CREATE OR REPLACE FUNCTION forum_reply_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE forum_posts
     SET reply_count = GREATEST(reply_count - 1, 0)
   WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_reply_deleted ON forum_replies;
CREATE TRIGGER trg_forum_reply_deleted
  AFTER DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_reply_deleted();

-- Đồng bộ lại số liệu đang lệch
UPDATE forum_posts p SET reply_count = COALESCE((
  SELECT count(*) FROM forum_replies r
   WHERE r.post_id = p.id AND r.status = 'active'
), 0)
WHERE p.reply_count IS DISTINCT FROM COALESCE((
  SELECT count(*) FROM forum_replies r
   WHERE r.post_id = p.id AND r.status = 'active'
), 0);

-- ── 4. Bucket lưu ảnh đính kèm trong bài/bình luận ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum', 'forum', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "forum_public_read" ON storage.objects;
CREATE POLICY "forum_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum');

-- Người dùng đăng nhập chỉ ghi được vào thư mục mang id của chính mình.
DROP POLICY IF EXISTS "forum_authenticated_upload" ON storage.objects;
CREATE POLICY "forum_authenticated_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "forum_owner_delete" ON storage.objects;
CREATE POLICY "forum_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum' AND (storage.foldername(name))[1] = auth.uid()::text);
