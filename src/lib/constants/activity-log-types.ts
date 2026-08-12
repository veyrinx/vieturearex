/**
 * Nhật ký hoạt động gộp ba loại việc rất khác nhau vào chung một bảng, nên chỗ
 * nào cũng cần biết hành động nào thuộc loại nào. Trước đây danh sách này nằm
 * trong component, còn API lại không biết gì — hệ quả là trang admin phải kéo
 * 1.000 dòng mới nhất rồi mới lọc, mà 98% trong đó là lượt xem của khách nên
 * việc quản trị thật bị đẩy ra ngoài cửa sổ.
 *
 * Giữ ở đây để API lọc thẳng dưới CSDL và component đọc cùng một danh sách.
 */

/** Người dùng tự làm, không phải thao tác quản trị. */
export const USER_LOG_ACTIONS = ["USER_REGISTERED", "USER_COMMENTED"] as const;

/** Khách vãng lai — số lượng áp đảo, hầu như luôn cần lọc riêng. */
export const VISITOR_LOG_ACTIONS = ["VISITOR_PAGE_VIEW"] as const;

/** Mọi hành động không thuộc hai nhóm trên đều tính là việc quản trị. */
export const NON_ADMIN_LOG_ACTIONS = [...USER_LOG_ACTIONS, ...VISITOR_LOG_ACTIONS];

export type ActivityLogType = "all" | "admin" | "user" | "visitor";

export const ACTIVITY_LOG_TYPES: ActivityLogType[] = ["all", "admin", "user", "visitor"];

export function isActivityLogType(value: string): value is ActivityLogType {
  return (ACTIVITY_LOG_TYPES as string[]).includes(value);
}
