import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  Eye,
  FileText,
  History,
  Megaphone,
  MessageSquare,
  Newspaper,
  PenLine,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, Chip, ErrorState, SectionTitle, Skeleton, cx } from "@/components/ui";
import { TrendChart } from "@/components/trend-chart";
import { useAuth, useHasRole } from "@/auth/auth-context";
import { useComments, useEvents, useLogs, useNews, useStats, useUsers } from "@/lib/queries";
import { compactNumber, timeAgo, truncate } from "@/lib/format";
import { errorMessage } from "@/components/toast";
import { haptic } from "@/lib/native";

export function DashboardScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = useHasRole("admin");

  const stats = useStats();
  const news = useNews();
  const events = useEvents();
  const users = useUsers(isAdmin);
  const logs = useLogs();
  const pendingNews = useComments("news_comments", "pending");
  const pendingEvents = useComments("event_comments", "pending");

  const pendingCount = (pendingNews.data?.length ?? 0) + (pendingEvents.data?.length ?? 0);
  const draftCount = news.data?.filter((item) => item.status === "draft").length ?? 0;

  return (
    <div className="space-y-6">
      <section className="animate-in-up">
        <p className="text-[13px] text-mist-500">{greeting()},</p>
        <h2 className="text-xl font-semibold">{profile?.displayName}</h2>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatTile
          icon={Eye}
          label="Lượt xem"
          value={stats.data ? compactNumber(stats.data.totalViews) : undefined}
          loading={stats.isLoading}
        />
        <StatTile
          icon={Users}
          label="Người dùng"
          value={
            isAdmin
              ? users.data
                ? compactNumber(users.data.length)
                : undefined
              : "—"
          }
          loading={isAdmin && users.isLoading}
          hint={isAdmin ? undefined : "Cần quyền Admin"}
        />
        <StatTile
          icon={Newspaper}
          label="Bài viết"
          value={news.data ? compactNumber(news.data.length) : undefined}
          loading={news.isLoading}
          hint={draftCount > 0 ? `${draftCount} bản nháp` : undefined}
        />
        <StatTile
          icon={CalendarRange}
          label="Sự kiện"
          value={events.data ? compactNumber(events.data.length) : undefined}
          loading={events.isLoading}
        />
      </section>

      {pendingCount > 0 && (
        <Card
          className="animate-in-up flex items-center gap-3 border-warn/30 bg-warn/8"
          onClick={() => navigate("/duyet")}
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-warn/15 text-warn">
            <MessageSquare className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">{pendingCount} bình luận chờ duyệt</p>
            <p className="text-[12px] text-mist-500">Chạm để mở trang kiểm duyệt</p>
          </div>
        </Card>
      )}

      <section>
        <SectionTitle>Lượt truy cập</SectionTitle>
        <Card>
          {stats.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : stats.isError ? (
            <ErrorState message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />
          ) : (
            <TrendChart data={stats.data?.chart ?? []} title="Lượt xem 30 ngày gần nhất" />
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Lối tắt</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction icon={PenLine} label="Đăng tin mới" onClick={() => navigate("/dang")} />
          <QuickAction
            icon={ShieldCheck}
            label="Kiểm duyệt"
            badge={pendingCount || undefined}
            onClick={() => navigate("/duyet")}
          />
          <QuickAction
            icon={Megaphone}
            label="Gửi thông báo"
            onClick={() => navigate("/he-thong/thong-bao")}
          />
          <QuickAction
            icon={Smartphone}
            label="Bản phát hành"
            onClick={() => navigate("/he-thong/ban-phat-hanh")}
          />
        </div>
      </section>

      {(stats.data?.topNews?.length ?? 0) > 0 && (
        <section>
          <SectionTitle>Bài được bình luận nhiều</SectionTitle>
          <Card className="divide-y divide-ink-800 p-0">
            {stats.data?.topNews.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-mist-500" />
                <p className="min-w-0 flex-1 truncate text-[13.5px]">{item.title}</p>
                <Chip tone="info">{item.comments}</Chip>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle
          action={
            <button
              type="button"
              onClick={() => navigate("/he-thong/nhat-ky")}
              className="text-[12px] text-cyan-glow"
            >
              Xem tất cả
            </button>
          }
        >
          Hoạt động gần đây
        </SectionTitle>
        <Card className="p-0">
          {logs.isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.isError ? (
            <div className="p-4">
              <ErrorState message={errorMessage(logs.error)} onRetry={() => void logs.refetch()} />
            </div>
          ) : (logs.data?.length ?? 0) === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-mist-500">Chưa có hoạt động nào.</p>
          ) : (
            <div className="divide-y divide-ink-800">
              {logs.data?.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <History className="mt-0.5 size-4 shrink-0 text-mist-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug">{truncate(log.summary, 70)}</p>
                    <p className="mt-0.5 text-[11.5px] text-mist-500">
                      {log.actor_email} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl2 border border-ink-700/70 bg-ink-850/80 p-3.5">
      <div className="flex items-center gap-2 text-mist-500">
        <Icon className="size-3.5" />
        <span className="text-[12px]">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16 rounded-lg" />
      ) : (
        <p className="mt-1 text-[26px] leading-tight font-semibold tabular-nums">{value ?? "—"}</p>
      )}
      {hint && <p className="text-[11px] text-mist-500">{hint}</p>}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={cx(
        "relative flex items-center gap-2.5 rounded-xl2 border border-ink-700/70 bg-ink-850/80 px-3.5 py-3.5 text-left transition active:scale-[0.98] active:bg-ink-800",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-glow/12 text-violet-glow">
        <Icon className="size-4" />
      </span>
      <span className="text-[13.5px] font-medium">{label}</span>
      {badge !== undefined && (
        <span className="absolute top-2.5 right-2.5 rounded-full bg-warn px-1.5 text-[10px] font-bold text-ink-950">
          {badge}
        </span>
      )}
    </button>
  );
}
