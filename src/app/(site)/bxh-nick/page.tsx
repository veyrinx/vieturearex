import { permanentRedirect } from "next/navigation";

// Đã gộp vào /bxh-nick-vn (tab "Cộng đồng tự khai" giữ nguyên dữ liệu account_scores).
export default function BxhNickPage() {
  permanentRedirect("/bxh-nick-vn");
}
