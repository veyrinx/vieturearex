"use client";

import { useEffect, useState } from "react";
import {
  Mail, Phone, User, Briefcase, Gamepad2, FileText, Calendar, Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ApplicantDetail = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  team_status: string | null;
  applied_role?: string | null;
  application_note?: string | null;
  phone?: string | null;
  game_profiles?: Array<{ game: string; uid: string; nickname?: string; custom_label?: string }> | null;
  created_at: string;
  avatar_url: string | null;
};

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border/50 py-2.5 last:border-b-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground break-words">{children}</div>
      </div>
    </div>
  );
}

export function ApplicantDetailDialog({
  applicant, open, onOpenChange,
}: {
  applicant: ApplicantDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [applicant?.id]);

  if (!applicant) return null;
  const a = applicant;
  const created = new Date(a.created_at).toLocaleString("vi-VN");
  const games = Array.isArray(a.game_profiles) ? a.game_profiles : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase tracking-wider">
            Hồ sơ ứng viên
            {a.team_status && (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
                {a.team_status}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          {a.avatar_url && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.avatar_url}
              alt={a.display_name ?? a.email}
              className="size-14 rounded-full border border-border object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background text-lg font-bold text-muted-foreground">
              {(a.display_name ?? a.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{a.display_name ?? "(Chưa đặt tên)"}</p>
            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border">
          <Row icon={Mail} label="Email">
            <a href={`mailto:${a.email}`} className="text-primary hover:underline dark:text-amber-400">{a.email}</a>
          </Row>
          {a.display_name && (
            <Row icon={User} label="Tên hiển thị">{a.display_name}</Row>
          )}
          {a.applied_role && (
            <Row icon={Briefcase} label="Vị trí ứng tuyển">
              <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
                {a.applied_role}
              </span>
            </Row>
          )}
          {a.phone && (
            <Row icon={Phone} label="Số điện thoại">
              <a href={`tel:${a.phone}`} className="font-mono text-primary hover:underline dark:text-amber-400">{a.phone}</a>
            </Row>
          )}
          {games.length > 0 && (
            <Row icon={Gamepad2} label={`Tài khoản game (${games.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {games.map((g, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px]">
                    <span className="font-bold uppercase text-primary dark:text-amber-400">
                      {g.custom_label || g.game.replace("_", " ")}
                    </span>
                    <span>{g.uid}</span>
                    {g.nickname && <span className="text-muted-foreground">({g.nickname})</span>}
                  </span>
                ))}
              </div>
            </Row>
          )}
          {a.application_note && (
            <Row icon={FileText} label="Lời nhắn">
              <p className="whitespace-pre-wrap rounded-md bg-muted/40 px-2.5 py-2 text-xs italic">
                {a.application_note}
              </p>
            </Row>
          )}
          <Row icon={Calendar} label="Đăng ký lúc">{created}</Row>
          {a.avatar_url && (
            <Row icon={ImageIcon} label="Avatar URL">
              <a href={a.avatar_url} target="_blank" rel="noreferrer" className="break-all text-[11px] text-primary hover:underline dark:text-amber-400">
                {a.avatar_url}
              </a>
            </Row>
          )}
          <Row icon={User} label="User ID">
            <code className="font-mono text-[11px] text-muted-foreground">{a.id}</code>
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
