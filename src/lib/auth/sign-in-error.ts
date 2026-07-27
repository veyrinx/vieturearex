/**
 * Đổi lỗi thô của Supabase Auth sang câu tiếng Việt nói đúng nguyên nhân.
 *
 * Trước đây trang đăng nhập gộp mọi lỗi thành "Email hoặc mật khẩu không chính
 * xác", nên tài khoản chưa xác thực email, bị khoá, hay bị chặn vì thử quá
 * nhiều lần đều hiện cùng một câu — không ai biết đường sửa.
 */
export function signInErrorMessage(error: {
  code?: string;
  message?: string;
  status?: number;
}): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Email chưa được xác thực. Kiểm tra hộp thư để kích hoạt tài khoản.";
  }
  if (code === "user_banned" || msg.includes("banned")) {
    return "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.";
  }
  if (code === "over_request_rate_limit" || error.status === 429 || msg.includes("rate limit")) {
    return "Bạn đã thử quá nhiều lần. Đợi vài phút rồi thử lại.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Không kết nối được máy chủ xác thực. Kiểm tra mạng rồi thử lại.";
  }
  return error.message
    ? `Đăng nhập thất bại: ${error.message}`
    : "Đăng nhập thất bại. Vui lòng thử lại.";
}
