"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  itemName: string;
  itemType: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  trigger: React.ReactNode;
};

export function ConfirmDeleteDialog({
  itemName,
  itemType,
  description,
  onConfirm,
  trigger,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/15">
                <AlertTriangle className="size-5 text-rose-500" />
              </div>
              <DialogTitle className="font-heading text-lg font-bold uppercase tracking-[0.04em] text-foreground">
                Xác nhận xóa {itemType}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Bạn sắp xóa{" "}
              <span className="font-semibold text-foreground">"{itemName}"</span>.{" "}
              {description ?? "Hành động này không thể hoàn tác sau khi thực hiện."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-xl border border-rose-400/25 bg-rose-500/8 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-500">
              Cảnh báo: Dữ liệu sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-border"
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              className="gap-2 bg-rose-500 hover:bg-rose-600"
            >
              <Trash2 className="size-4" />
              {loading ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
