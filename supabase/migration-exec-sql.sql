-- ============================================================
-- exec_sql — hàm chạy SQL tuỳ ý cho trang /admin/sql
--
-- Trang SQL Editor trong admin gọi RPC này, nhưng hàm chưa từng được tạo nên
-- mọi câu lệnh gõ vào đó đều trả lỗi "không tìm thấy hàm".
--
-- ⚠️ ĐÂY LÀ HÀM NGUY HIỂM NHẤT TRONG CSDL. Gọi được nó là chạy được mọi câu
-- lệnh SQL. Ba lớp chặn dưới đây phải giữ nguyên:
--
--   1. SECURITY INVOKER — chạy bằng quyền của người gọi, KHÔNG phải quyền chủ
--      hàm. Bản SECURITY DEFINER hay được chép trên mạng biến hàm này thành
--      cửa hậu quyền postgres cho bất kỳ ai gọi được.
--   2. REVOKE khỏi anon và authenticated — nếu không, mọi khách vãng lai đều
--      POST thẳng /rest/v1/rpc/exec_sql được. Chỉ service_role giữ quyền, mà
--      khoá service_role thì không bao giờ ra tới trình duyệt.
--   3. Route /api/admin/sql còn chặn thêm: super_admin, có quyền sql.run, và
--      giới hạn 20 lượt mỗi phút.
--
-- Trả về luôn là mảng JSON để bảng kết quả bên admin hiển thị được:
--   SELECT / WITH / VALUES / TABLE → các hàng thật.
--   Còn lại (INSERT, UPDATE, CREATE, ALTER…) → một hàng tóm tắt
--     [{"command":"UPDATE","rows_affected":12}]
--   EXPLAIN và SHOW chạy được nhưng không lấy được kết quả, chỉ báo đã chạy.
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  cleaned  text;
  verb     text;
  result   json;
  affected bigint;
BEGIN
  -- Bỏ khoảng trắng và dấu chấm phẩy ở hai đầu: câu lệnh còn dấu ; mà đem
  -- bọc vào trong ngoặc là lỗi cú pháp.
  cleaned := btrim(query, E' \t\r\n;');
  IF cleaned = '' THEN
    RETURN '[]'::json;
  END IF;

  verb := upper((regexp_match(cleaned, '^\s*([a-zA-Z]+)'))[1]);

  -- Câu đọc được: bọc lại để gom thành JSON.
  IF verb IN ('SELECT', 'WITH', 'VALUES', 'TABLE') THEN
    EXECUTE format('SELECT coalesce(json_agg(t), ''[]''::json) FROM (%s) AS t', cleaned)
      INTO result;
    RETURN result;
  END IF;

  -- Còn lại chạy thẳng rồi báo số hàng bị đụng tới.
  EXECUTE cleaned;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN json_build_array(
    json_build_object('command', verb, 'rows_affected', affected)
  );
END;
$$;

-- ── Khoá quyền gọi ──────────────────────────────────────────
-- Postgres mặc định cho PUBLIC chạy hàm mới, nên phải thu hồi trước rồi mới
-- cấp lại đúng một vai.
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

COMMENT ON FUNCTION public.exec_sql(text) IS
  'Chạy SQL tuỳ ý cho /admin/sql. Chỉ service_role gọi được. Đừng đổi sang SECURITY DEFINER.';

-- Kiểm tra sau khi chạy — phải ra đúng một dòng, prosecdef = false:
-- SELECT proname, prosecdef, proacl FROM pg_proc WHERE proname = 'exec_sql';
