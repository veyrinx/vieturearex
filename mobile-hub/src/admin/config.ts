import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/types";

/**
 * Khai báo các mục quản trị thay vì viết tay từng màn hình.
 *
 * Bảng quản trị web có hơn bốn chục mục, phần lớn chỉ là "lấy danh sách — sửa —
 * lưu". Viết tay ngần ấy màn hình trên app thì vừa lâu vừa mỗi cái một kiểu, nên
 * ở đây mô tả chúng bằng dữ liệu rồi để hai màn hình dùng chung dựng giao diện
 * (xem components/resource-screen.tsx):
 *
 *  - `array` — danh sách nằm gọn trong MỘT dòng cài đặt JSON. API trả cả mảng,
 *    sửa xong PUT lại cả mảng (đối tác, dự án, gói Prime, khoá chức năng…).
 *  - `rows`  — mỗi mục là một dòng trong bảng. Tạo POST, sửa PATCH/PUT, xoá
 *    DELETE từng cái (stream, khung avatar, tier list…).
 *
 * Mục nào có logic riêng (CSKH, hợp đồng, giấy phép…) vẫn viết màn hình riêng và
 * chỉ khai báo ở registry.tsx.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "switch"
  | "select"
  | "image"
  | "date"
  | "datetime"
  | "tags"
  | "url";

export type FieldDef = {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  bucket?: "logos" | "forum" | "events";
};

export type ResourceItem = Record<string, unknown>;

type BaseConfig = {
  /** Đường dẫn API (không kèm origin). */
  endpoint: string;
  /** Khoá chứa mảng trong JSON server trả về. */
  listKey: string;
  fields: FieldDef[];
  titleField: string;
  subtitleField?: string;
  /** Danh từ số ít, dùng trong nút "Thêm …" và câu hỏi xoá. */
  itemLabel: string;
  emptyHint?: string;
};

export type ArrayResourceConfig = BaseConfig & {
  kind: "array";
  /** Khoá trong body PUT, mặc định bằng listKey. */
  putKey?: string;
  /** Mẫu cho mục mới. `id` tự sinh nếu cấu hình có trường id. */
  blank: ResourceItem;
  /** Trường boolean bật/tắt hiện ngay ngoài danh sách. */
  enabledField?: string;
  /** Cho phép đổi thứ tự (thứ tự trong mảng chính là thứ tự hiển thị ngoài web). */
  reorder?: boolean;
};

export type RowResourceConfig = BaseConfig & {
  kind: "rows";
  idField?: string;
  createMethod?: "POST";
  updateMethod?: "PATCH" | "PUT" | "POST";
  /** PUT/DELETE truyền id qua query string thay vì body. */
  idInQuery?: boolean;
  /** Tham số luôn kèm theo mọi lệnh (ví dụ cosmetics cần `type=frame`). */
  params?: Record<string, string>;
  /** Trường gộp thêm vào body khi tạo/sửa. */
  extra?: ResourceItem;
  canCreate?: boolean;
  canDelete?: boolean;
  /** Bộ lọc trạng thái — giá trị nối vào query GET. */
  filter?: { param: string; options: { value: string; label: string }[] };
  /**
   * Chỉnh body lần cuối trước khi gửi.
   *
   * Cần cho những endpoint khó tính: bản ghi đọc về có cột `null` mà lược đồ ghi
   * lại chỉ nhận mảng, gửi thẳng là dính 400.
   */
  normalize?: (payload: ResourceItem) => ResourceItem;
};

export type ResourceConfig = ArrayResourceConfig | RowResourceConfig;

/** Một mục trong bảng quản trị của app. */
export type AdminSection = {
  id: string;
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: AdminGroup;
  /** Vai trò tối thiểu để MỞ được — khớp với `enforceAdminApiAuth` phía server. */
  minRole: UserRole;
  /** Từ khoá phụ cho ô tìm kiếm (viết không dấu cũng tìm được). */
  keywords?: string;
};

export type AdminGroup =
  | "Nội dung"
  | "Cộng đồng"
  | "Kinh doanh"
  | "Giao diện & trang"
  | "Hệ thống";

export const GROUP_ORDER: AdminGroup[] = [
  "Nội dung",
  "Cộng đồng",
  "Kinh doanh",
  "Giao diện & trang",
  "Hệ thống",
];
