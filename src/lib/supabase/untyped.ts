import type { SupabaseClient } from "@supabase/supabase-js";

// Helper để query các bảng chưa có trong generated types
// Dùng thay cho (supabase as any) để tránh eslint no-explicit-any
export function untypedFrom(client: SupabaseClient, table: string) {
  return (client as unknown as { from: (t: string) => ReturnType<SupabaseClient["from"]> }).from(table);
}
