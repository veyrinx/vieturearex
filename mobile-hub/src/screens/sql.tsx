import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play, TriangleAlert } from "lucide-react";
import { Button, Card, ConfirmSheet, Field, Textarea } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";

/**
 * Chạy SQL thẳng trên cơ sở dữ liệu (chỉ super_admin — server tự chặn).
 *
 * Câu lệnh không phải SELECT thì hỏi lại một lần: gõ nhầm trên điện thoại dễ
 * hơn trên máy tính rất nhiều, mà UPDATE thiếu WHERE thì không lấy lại được.
 */

export function SqlScreen() {
  const toast = useToast();
  const [sql, setSql] = useState("");
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = useMutation({
    mutationFn: (query: string) =>
      api<{ data: unknown[] }>("/api/admin/sql", { method: "POST", body: { sql: query } }),
    onSuccess: (data) => {
      setRows(data?.data ?? []);
      setConfirming(false);
      toast.success(`Xong — ${data?.data?.length ?? 0} dòng.`);
    },
    onError: (error: Error) => {
      setConfirming(false);
      toast.error(error.message);
    },
  });

  const readOnly = /^\s*(select|with|explain)\b/i.test(sql);

  function submit() {
    if (!sql.trim()) return;
    if (readOnly) run.mutate(sql.trim());
    else setConfirming(true);
  }

  return (
    <div className="space-y-4">
      <SubHeader title="SQL" description="Chạy câu lệnh trực tiếp trên dữ liệu" />

      <Card className="flex items-start gap-2.5 border-warn/25 bg-warn/8">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <p className="text-[12.5px] leading-relaxed text-warn">
          Lệnh chạy thẳng trên dữ liệu thật và không hoàn tác được. Nên thử bằng SELECT trước.
        </p>
      </Card>

      <Field label="Câu lệnh">
        <Textarea
          rows={7}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="select id, email from users limit 10;"
          className="font-mono text-[13px]"
        />
      </Field>

      <Button block icon={Play} loading={run.isPending} onClick={submit}>
        Chạy
      </Button>

      {rows && (
        <Card className="overflow-x-auto">
          <p className="mb-2 text-[12px] text-mist-500">{rows.length} dòng</p>
          <pre className="text-[11.5px] leading-relaxed whitespace-pre text-mist-200">
            {JSON.stringify(rows, null, 2)}
          </pre>
        </Card>
      )}

      <ConfirmSheet
        open={confirming}
        title="Lệnh này thay đổi dữ liệu"
        message="Không phải SELECT — chạy xong không quay lại được. Chắc chưa?"
        confirmLabel="Chạy"
        destructive
        loading={run.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => run.mutate(sql.trim())}
      />
    </div>
  );
}
