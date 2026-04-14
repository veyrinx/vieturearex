import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <div className="glass-card w-full space-y-4 rounded-2xl p-6 text-center">
        <h1 className="font-heading text-4xl font-bold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">
          Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
