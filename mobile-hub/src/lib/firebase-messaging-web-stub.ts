/**
 * Chặn nhánh web của `@capacitor-firebase/messaging`.
 *
 * Plugin đó có ba bản cài đặt: iOS, Android và Web. Bản Web import SDK JavaScript
 * `firebase/messaging` — một gói nặng chỉ để làm Web Push trong trình duyệt.
 *
 * Arex Hub là app native đóng gói sẵn, không bao giờ chạy như web app thật:
 * `registerPush()` đã chặn bằng `if (!isNative) return`, nên bản Web không có
 * đường nào được gọi tới. Nhưng Vite vẫn phải phân giải câu import lúc build,
 * và sẽ đứt nếu gói `firebase` không có mặt.
 *
 * Nên thay vì cài thêm cả SDK cho một nhánh chết, `vite.config.ts` trỏ
 * `firebase/messaging` về file này. Mọi hàm ở đây đều ném lỗi rõ ràng — nếu một
 * ngày nào đó thật sự cần push trên trình duyệt thì sẽ thấy ngay thông báo này
 * thay vì một lỗi khó hiểu.
 */

const MESSAGE =
  "Arex Hub không hỗ trợ thông báo đẩy trên trình duyệt — chỉ chạy trong app native.";

export function getMessaging(): never {
  throw new Error(MESSAGE);
}

export function getToken(): never {
  throw new Error(MESSAGE);
}

export function deleteToken(): never {
  throw new Error(MESSAGE);
}

export function onMessage(): never {
  throw new Error(MESSAGE);
}

/** Plugin gọi hàm này trước tiên; trả false là nó tự bỏ qua, không ném lỗi. */
export function isSupported(): Promise<boolean> {
  return Promise.resolve(false);
}
