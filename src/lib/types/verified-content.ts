export type VerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "SUBMIT_VERIFY"
  | "VERIFY"
  | "REJECT"
  | "EXPIRE"
  | "SOFT_DELETE";

export interface VerifiedContentItem {
  id: string;
  user_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  title: string;
  content_body: string;
  verification_status: VerificationStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  /** Full verification details object from backend contract */
  verification_info?: PublicVerificationInfo | null;
}

export interface ContentVerificationRecord {
  id: string;
  content_id: string;
  verified_at: string;
  verified_by: string;
  verified_by_name?: string | null;
  verification_note?: string | null; // Sensitive internal note - ONLY present for mods/admins!
  verification_source: string | null;
  content_hash: string;
  verification_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicVerificationInfo {
  status: VerificationStatus;
  is_verified_active: boolean; // True if status === 'VERIFIED' AND current_time <= verification_expires_at
  verified_at?: string | null;
  verified_by_name?: string | null;
  verification_source?: string | null;
  verification_expires_at?: string | null;
  content_hash?: string | null;
}

export interface AdminVerificationInfo extends PublicVerificationInfo {
  verification_note?: string | null; // Moderator internal note
  verified_by?: string | null;
}

export interface ContentAuditLogItem {
  id: string;
  content_id: string;
  actor_id: string;
  actor_name?: string | null;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ModeratorVerificationChecklist {
  sourceChecked: boolean;        // 1. Nguồn thông tin
  accuracyChecked: boolean;      // 2. Độ chính xác
  updatedTimeChecked: boolean;   // 3. Thời điểm cập nhật
  integrityChecked: boolean;     // 4. Kiểm tra chỉnh sửa / bất thường
  complianceChecked: boolean;    // 5. Tuân thủ quy định Arex Network
}
