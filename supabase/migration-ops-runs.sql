-- ============================================================================
-- Nhật ký việc định kỳ (cron) — chạy TAY một lần trên Supabase SQL Editor.
-- An toàn chạy lại (idempotent).
--
-- Vì sao cần: 13 việc định kỳ đang chạy mà không để lại dấu vết. Cron hỏng thì
-- hỏng lặng lẽ — Vercel chỉ giữ log ngắn ngày, và không ai đi soi cho tới lúc
-- người dùng kêu "sao mấy hôm nay không thấy thông báo". Bảng này ghi lại mỗi
-- lần chạy: mất bao lâu, ra kết quả gì, lỗi gì — đủ để trang /admin/ops chỉ ra
-- việc nào chết, việc nào quá hạn.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ops_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tên việc, trùng với path cron: 'daily-report', 'ff-watch', ...
  job         text NOT NULL,
  ok          boolean NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  -- Kết quả rút gọn (đã cắt bớt) để đọc nhanh mà không phải mở log Vercel.
  summary     jsonb,
  error       text,
  -- 'cron' = do Vercel gọi theo lịch · 'manual' = admin bấm chạy lại.
  trigger     text NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron', 'manual')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_runs_job_idx     ON public.ops_runs(job, started_at DESC);
CREATE INDEX IF NOT EXISTS ops_runs_started_idx ON public.ops_runs(started_at DESC);
-- Lọc nhanh "có lỗi nào trong 7 ngày qua không".
CREATE INDEX IF NOT EXISTS ops_runs_failed_idx  ON public.ops_runs(started_at DESC) WHERE ok = false;

-- Chỉ service role đọc/ghi: bật RLS và KHÔNG cấp policy nào cho người dùng.
-- Trang quản trị đọc qua /api/admin/ops (đã qua enforceAdminApiAuth).
ALTER TABLE public.ops_runs ENABLE ROW LEVEL SECURITY;
