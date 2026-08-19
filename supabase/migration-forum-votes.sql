-- ============================================================
-- Arex — Diễn đàn: phiếu "hữu ích" đếm thật, và mở cho cả câu trả lời
--
-- Trước đây nút "hữu ích" của bài viết chỉ cộng thẳng forum_posts.helpful_count
-- rồi ghi một cờ vào localStorage. Xoá localStorage, mở tab ẩn danh hay đổi
-- máy là bấm lại được — con số đó không đo được gì. Bảng forum_post_votes đã
-- tồn tại sẵn (khoá chính post_id + user_id) nhưng chưa dòng code nào ghi vào.
--
-- Phần bài viết đã sửa xong bằng code (dùng bảng có sẵn, không cần chạy gì).
-- File này chỉ thêm phần còn thiếu để CÂU TRẢ LỜI cũng bình chọn được.
-- Chưa chạy thì nút bình chọn ở câu trả lời tự ẩn, phần còn lại vẫn chạy bình
-- thường.
--
-- Chạy 1 lần trên Supabase SQL editor (service_role không có quyền DDL nên
-- không chạy qua /admin/sql được). An toàn khi chạy lại.
-- ============================================================

-- ── Phiếu cho câu trả lời ───────────────────────────────────
-- Cùng khuôn với forum_post_votes: khoá chính đôi tự chặn phiếu trùng, không
-- cần cột id riêng.
CREATE TABLE IF NOT EXISTS public.forum_reply_votes (
  reply_id uuid NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (reply_id, user_id)
);

CREATE INDEX IF NOT EXISTS forum_reply_votes_user_idx
  ON public.forum_reply_votes(user_id);

-- Mọi lượt ghi đi qua service_role trong route API, nên bật RLS và cố ý không
-- thêm policy nào: trình duyệt không đọc/ghi thẳng bảng phiếu được.
ALTER TABLE public.forum_reply_votes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

-- Câu trả lời được vote nhiều nổi lên đầu luồng; bài đông trả lời cần lấy top
-- nhanh nên tách index riêng thay vì dựa vào index theo thời gian.
CREATE INDEX IF NOT EXISTS forum_replies_helpful_idx
  ON public.forum_replies(post_id, helpful_count DESC);

-- ── Rửa số cũ ───────────────────────────────────────────────
-- helpful_count của bài viết từng là bộ đếm cộng dồn không có phiếu tương ứng.
-- Kéo nó về đúng số phiếu thật trong bảng.
UPDATE public.forum_posts p
SET helpful_count = (SELECT count(*) FROM public.forum_post_votes v WHERE v.post_id = p.id)
WHERE p.helpful_count IS DISTINCT FROM
      (SELECT count(*) FROM public.forum_post_votes v WHERE v.post_id = p.id);
