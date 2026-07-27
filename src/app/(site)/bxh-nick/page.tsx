import { permanentRedirect } from "next/navigation";

// Đã gộp vào /top-players-vn (tab "Cộng đồng tự khai" giữ nguyên dữ liệu account_scores).
export default function BxhNickPage() {
  permanentRedirect("/top-players-vn");
}
