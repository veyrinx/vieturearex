import { getPageBody } from "@/lib/server/page-content";
import { sanitizeRichText } from "@/lib/server/sanitize";

/**
 * Bọc nội dung mặc định của một trang tĩnh.
 * - Admin chưa đặt nội dung → render nguyên `children` (bản viết sẵn trong code).
 * - Admin đã đặt → render nội dung đó, đã qua sanitizeRichText để chặn XSS.
 *
 * Server component: trang bọc nó phải là server component và nên đặt
 * `export const revalidate` để không gọi DB mỗi request.
 */
export async function PageContentOverride({
  pageKey,
  children,
}: {
  pageKey: string;
  children: React.ReactNode;
}) {
  const body = await getPageBody(pageKey);
  if (!body) return <>{children}</>;

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-black prose-a:text-primary"
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
    />
  );
}
