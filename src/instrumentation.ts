/**
 * Next gọi register() một lần khi máy chủ khởi động, trước request đầu tiên.
 * Nạp biến môi trường lưu trong DB vào process.env — xem lib/server/env-config.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { hydrateEnvFromDb } = await import("@/lib/server/env-config");
  await hydrateEnvFromDb().catch((err) => console.warn("[env] Nạp biến từ DB thất bại:", err));
}
