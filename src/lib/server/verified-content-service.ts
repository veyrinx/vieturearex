import "server-only";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  VerificationStatus,
  AuditAction,
  VerifiedContentItem,
  PublicVerificationInfo,
  AdminVerificationInfo,
  ContentAuditLogItem,
} from "@/lib/types/verified-content";

/**
 * Compute SHA-256 hash of content body for data integrity check
 */
export function computeContentHash(contentBody: string): string {
  return crypto.createHash("sha256").update(contentBody, "utf8").digest("hex");
}

/**
 * Dynamic Expiration Check
 * Evaluates whether a VERIFIED content has passed its verification_expires_at date.
 */
export function getEffectiveStatus(
  status: VerificationStatus,
  expiresAt?: string | null
): VerificationStatus {
  if (status === "VERIFIED" && expiresAt) {
    const expDate = new Date(expiresAt);
    if (!isNaN(expDate.getTime()) && new Date() > expDate) {
      return "EXPIRED";
    }
  }
  return status;
}

/**
 * Build Backend-to-Frontend Public Verification Contract
 * IMPORTANT SECURITY REQUIREMENT: verification_note is STRICTLY REMOVED for public users
 * to prevent IDOR / Sensitive Data Exposure.
 */
export function buildPublicVerificationInfo(
  status: VerificationStatus,
  record?: {
    verified_at?: string | null;
    verified_by_name?: string | null;
    verification_source?: string | null;
    verification_expires_at?: string | null;
    content_hash?: string | null;
  } | null
): PublicVerificationInfo {
  const effectiveStatus = getEffectiveStatus(status, record?.verification_expires_at);
  const is_verified_active =
    effectiveStatus === "VERIFIED" &&
    (!record?.verification_expires_at || new Date() <= new Date(record.verification_expires_at));

  return {
    status: effectiveStatus,
    is_verified_active,
    verified_at: record?.verified_at ?? null,
    verified_by_name: record?.verified_by_name ?? null,
    verification_source: record?.verification_source ?? null,
    verification_expires_at: record?.verification_expires_at ?? null,
    content_hash: record?.content_hash ?? null,
  };
}

/**
 * Append-Only Audit Log Writer
 */
async function appendAuditLog(params: {
  content_id: string;
  actor_id: string;
  action: AuditAction;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return;

  await (supabase as any).from("content_audit_logs").insert({
    content_id: params.content_id,
    actor_id: params.actor_id,
    action: params.action,
    old_data: params.old_data || null,
    new_data: params.new_data || null,
    ip_address: params.ip_address || "127.0.0.1",
    created_at: new Date().toISOString(),
  });
}

/**
 * Verified Content Core Service
 */
export const VerifiedContentService = {
  /**
   * 1. Create Content (Action: CREATE)
   */
  async createContent(params: {
    userId: string;
    title: string;
    contentBody: string;
    ipAddress?: string;
  }): Promise<{ data: VerifiedContentItem | null; error: string | null }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { data: null, error: "Database client unavailable" };

    const { data: inserted, error } = await (supabase as any)
      .from("contents")
      .insert({
        user_id: params.userId,
        title: params.title,
        content_body: params.contentBody,
        verification_status: "UNVERIFIED",
        is_deleted: false,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      return { data: null, error: error?.message || "Failed to create content" };
    }

    const contentItem = inserted;

    await appendAuditLog({
      content_id: contentItem.id,
      actor_id: params.userId,
      action: "CREATE",
      new_data: {
        title: params.title,
        content_body: params.contentBody,
        verification_status: "UNVERIFIED",
      },
      ip_address: params.ipAddress,
    });

    return {
      data: {
        ...contentItem,
        verification_info: buildPublicVerificationInfo("UNVERIFIED"),
      },
      error: null,
    };
  },

  /**
   * 2. Fetch Contents List (Public / User Feed)
   */
  async getContents(options?: {
    status?: VerificationStatus;
    userId?: string;
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
    isAdminView?: boolean;
  }): Promise<{ data: VerifiedContentItem[]; count: number }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { data: [], count: 0 };

    let query = (supabase as any).from("contents").select("*", { count: "exact" });

    if (!options?.includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    if (options?.status) {
      query = query.eq("verification_status", options.status);
    }

    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20) - 1);

    const { data: rows, count, error } = await query;
    if (error || !rows) return { data: [], count: 0 };

    const contentIds = rows.map((r: any) => r.id);
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));

    // Fetch author details
    const { data: users } = await (supabase as any)
      .from("users")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    // Fetch verifications records
    const { data: verificationsData } = contentIds.length
      ? await (supabase as any)
          .from("content_verifications")
          .select("*")
          .in("content_id", contentIds)
      : { data: [] };

    const verificationsList: any[] = verificationsData || [];
    const verifMap = new Map(verificationsList.map((v: any) => [v.content_id, v]));

    // Fetch verifier display names
    const verifierIds = Array.from(
      new Set(
        verificationsList
          .map((v: any) => v.verified_by)
          .filter(Boolean)
      )
    );
    const { data: verifiersData } = verifierIds.length
      ? await (supabase as any)
          .from("users")
          .select("id, display_name")
          .in("id", verifierIds)
      : { data: [] };
    const verifiersList: any[] = verifiersData || [];
    const verifierMap = new Map(verifiersList.map((v: any) => [v.id, v.display_name]));

    const items: VerifiedContentItem[] = rows.map((item: any) => {
      const author: any = userMap.get(item.user_id);
      const vRec: any = verifMap.get(item.id);
      const verifierName: string | null = vRec ? (verifierMap.get(vRec.verified_by) || "Arex Moderator") : null;

      const pubInfo = buildPublicVerificationInfo(item.verification_status as VerificationStatus, {
        verified_at: vRec?.verified_at,
        verified_by_name: verifierName,
        verification_source: vRec?.verification_source,
        verification_expires_at: vRec?.verification_expires_at,
        content_hash: vRec?.content_hash,
      });

      return {
        id: item.id,
        user_id: item.user_id,
        author_name: author?.display_name || "Unknown User",
        author_avatar: author?.avatar_url || null,
        title: item.title,
        content_body: item.content_body,
        verification_status: pubInfo.status,
        is_deleted: item.is_deleted,
        created_at: item.created_at,
        updated_at: item.updated_at,
        verification_info: pubInfo,
      };
    });

    return { data: items, count: count || items.length };
  },

  /**
   * 3. Get Single Content Details (with security isolation for notes)
   */
  async getContentById(
    contentId: string,
    requestingUser?: { id: string; isModerator: boolean }
  ): Promise<{
    data: VerifiedContentItem | null;
    verificationDetails?: AdminVerificationInfo | null;
    error: string | null;
  }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { data: null, error: "Database client unavailable" };

    const { data: item, error } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (error || !item) return { data: null, error: "Content not found" };

    const { data: author } = await (supabase as any)
      .from("users")
      .select("display_name, avatar_url")
      .eq("id", item.user_id)
      .single();

    const { data: vRec } = await (supabase as any)
      .from("content_verifications")
      .select("*")
      .eq("content_id", contentId)
      .maybeSingle();

    let verifierName: string | null = null;
    if (vRec?.verified_by) {
      const { data: verifier } = await (supabase as any)
        .from("users")
        .select("display_name")
        .eq("id", vRec.verified_by)
        .maybeSingle();
      verifierName = verifier?.display_name || "Arex Moderator";
    }

    const publicInfo = buildPublicVerificationInfo(item.verification_status as VerificationStatus, {
      verified_at: vRec?.verified_at,
      verified_by_name: verifierName,
      verification_source: vRec?.verification_source,
      verification_expires_at: vRec?.verification_expires_at,
      content_hash: vRec?.content_hash,
    });

    const isMod = requestingUser?.isModerator ?? false;

    // Admin / Moderator verification details WITH internal note
    const adminDetails: AdminVerificationInfo | null = isMod && vRec
      ? {
          ...publicInfo,
          verification_note: vRec.verification_note,
          verified_by: vRec.verified_by,
        }
      : null;

    return {
      data: {
        id: item.id,
        user_id: item.user_id,
        author_name: author?.display_name || "Unknown User",
        author_avatar: author?.avatar_url || null,
        title: item.title,
        content_body: item.content_body,
        verification_status: publicInfo.status,
        is_deleted: item.is_deleted,
        created_at: item.created_at,
        updated_at: item.updated_at,
        verification_info: publicInfo,
      },
      verificationDetails: adminDetails,
      error: null,
    };
  },

  /**
   * 4. Update Content (Immutable Guard & Status Reset to UNVERIFIED)
   */
  async updateContent(params: {
    contentId: string;
    actorId: string;
    title: string;
    contentBody: string;
    ipAddress?: string;
  }): Promise<{ data: VerifiedContentItem | null; error: string | null }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { data: null, error: "Database client unavailable" };

    const { data: existing, error: fetchErr } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", params.contentId)
      .single();

    if (fetchErr || !existing) return { data: null, error: "Content not found" };

    if (existing.is_deleted) return { data: null, error: "Cannot edit deleted content" };

    // RULE 4: If content was VERIFIED, modifying it demotes status to UNVERIFIED (or blocks unauthorized direct edit)
    const oldStatus = existing.verification_status as VerificationStatus;
    const newStatus: VerificationStatus = "UNVERIFIED";

    const { data: updated, error: updateErr } = await (supabase as any)
      .from("contents")
      .update({
        title: params.title,
        content_body: params.contentBody,
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.contentId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return { data: null, error: updateErr?.message || "Failed to update content" };
    }

    await appendAuditLog({
      content_id: params.contentId,
      actor_id: params.actorId,
      action: "UPDATE",
      old_data: {
        title: existing.title,
        content_body: existing.content_body,
        verification_status: oldStatus,
      },
      new_data: {
        title: params.title,
        content_body: params.contentBody,
        verification_status: newStatus,
      },
      ip_address: params.ipAddress,
    });

    return this.getContentById(params.contentId);
  },

  /**
   * 5. State Transition: Submit for Verification (UNVERIFIED/REJECTED/EXPIRED -> PENDING)
   */
  async submitForVerification(params: {
    contentId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { success: false, error: "Database client unavailable" };

    const { data: existing } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", params.contentId)
      .single();

    if (!existing) return { success: false, error: "Content not found" };

    const effectiveStatus = getEffectiveStatus(existing.verification_status as VerificationStatus);

    // STATE TRANSITION GUARD: Creator can only transition from UNVERIFIED/REJECTED/EXPIRED -> PENDING
    if (
      effectiveStatus !== "UNVERIFIED" &&
      effectiveStatus !== "REJECTED" &&
      effectiveStatus !== "EXPIRED"
    ) {
      return {
        success: false,
        error: `Cannot submit for verification from status ${effectiveStatus}. Current status must be UNVERIFIED, REJECTED, or EXPIRED.`,
      };
    }

    const { error: updateErr } = await (supabase as any)
      .from("contents")
      .update({
        verification_status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.contentId);

    if (updateErr) return { success: false, error: updateErr.message };

    await appendAuditLog({
      content_id: params.contentId,
      actor_id: params.actorId,
      action: "SUBMIT_VERIFY",
      old_data: { verification_status: existing.verification_status },
      new_data: { verification_status: "PENDING" },
      ip_address: params.ipAddress,
    });

    return { success: true, error: null };
  },

  /**
   * 6. State Transition: Moderator Verification (PENDING -> VERIFIED or REJECTED)
   */
  async reviewVerification(params: {
    contentId: string;
    moderatorId: string;
    decision: "VERIFY" | "REJECT";
    verificationSource?: string;
    verificationNote?: string; // Internal note for audit/moderators
    expiresAt?: string | null;
    ipAddress?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { success: false, error: "Database client unavailable" };

    const { data: existing } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", params.contentId)
      .single();

    if (!existing) return { success: false, error: "Content not found" };

    if (existing.verification_status !== "PENDING") {
      return {
        success: false,
        error: `Moderator review requires status PENDING. Current status is ${existing.verification_status}.`,
      };
    }

    const newStatus: VerificationStatus =
      params.decision === "VERIFY" ? "VERIFIED" : "REJECTED";

    // Hash content_body for data integrity
    const hash = computeContentHash(existing.content_body);

    const { error: updateErr } = await (supabase as any)
      .from("contents")
      .update({
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.contentId);

    if (updateErr) return { success: false, error: updateErr.message };

    if (params.decision === "VERIFY") {
      // Upsert into content_verifications
      await (supabase as any).from("content_verifications").upsert(
        {
          content_id: params.contentId,
          verified_at: new Date().toISOString(),
          verified_by: params.moderatorId,
          verification_note: params.verificationNote || null,
          verification_source: params.verificationSource || null,
          content_hash: hash,
          verification_expires_at: params.expiresAt || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_id" }
      );
    } else {
      // If REJECTED, store internal reason note in content_verifications if provided
      if (params.verificationNote) {
        await (supabase as any).from("content_verifications").upsert(
          {
            content_id: params.contentId,
            verified_at: new Date().toISOString(),
            verified_by: params.moderatorId,
            verification_note: params.verificationNote,
            verification_source: params.verificationSource || null,
            content_hash: hash,
            verification_expires_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "content_id" }
        );
      }
    }

    await appendAuditLog({
      content_id: params.contentId,
      actor_id: params.moderatorId,
      action: params.decision,
      old_data: { verification_status: "PENDING" },
      new_data: {
        verification_status: newStatus,
        verification_source: params.verificationSource,
        verification_expires_at: params.expiresAt,
        content_hash: hash,
        verification_note: params.verificationNote,
      },
      ip_address: params.ipAddress,
    });

    return { success: true, error: null };
  },

  /**
   * 7. Soft Delete Content (NO Hard Delete)
   */
  async softDeleteContent(params: {
    contentId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return { success: false, error: "Database client unavailable" };

    const { data: existing } = await (supabase as any)
      .from("contents")
      .select("*")
      .eq("id", params.contentId)
      .single();

    if (!existing) return { success: false, error: "Content not found" };

    // Soft delete: is_deleted = true
    const { error: updateErr } = await (supabase as any)
      .from("contents")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.contentId);

    if (updateErr) return { success: false, error: updateErr.message };

    await appendAuditLog({
      content_id: params.contentId,
      actor_id: params.actorId,
      action: "SOFT_DELETE",
      old_data: { is_deleted: false, verification_status: existing.verification_status },
      new_data: { is_deleted: true },
      ip_address: params.ipAddress,
    });

    return { success: true, error: null };
  },

  /**
   * 8. Fetch Append-Only Audit Logs for a Content Item
   */
  async getAuditLogs(contentId: string): Promise<ContentAuditLogItem[]> {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return [];

    const { data: logs, error } = await (supabase as any)
      .from("content_audit_logs")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    if (error || !logs) return [];

    const actorIds = Array.from(new Set(logs.map((l: any) => l.actor_id)));
    const { data: actors } = actorIds.length
      ? await (supabase as any).from("users").select("id, display_name").in("id", actorIds)
      : { data: [] };

    const actorMap = new Map((actors || []).map((a: any) => [a.id, a.display_name]));

    return logs.map((l: any) => ({
      id: l.id,
      content_id: l.content_id,
      actor_id: l.actor_id,
      actor_name: actorMap.get(l.actor_id) || "System / Actor",
      action: l.action as AuditAction,
      old_data: l.old_data,
      new_data: l.new_data,
      ip_address: l.ip_address,
      created_at: l.created_at,
    }));
  },
};
