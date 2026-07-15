"use client";

import Link from "next/link";
import { SlidersHorizontal, ListOrdered, Combine } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    href: "/do-nhay",
    label: "Chỉnh Độ Nhạy",
    desc: "Tìm cấu hình sensitivity hoàn hảo cho thiết bị của bạn.",
    icon: SlidersHorizontal,
    color: "from-blue-500 to-sky-500",
  },
  {
    href: "/tier-list",
    label: "Tier List Nhân Vật",
    desc: "Bảng xếp hạng sức mạnh các nhân vật trong meta hiện tại.",
    icon: ListOrdered,
    color: "from-purple-500 to-violet-500",
  },
  {
    href: "/combo",
    label: "Tạo Combo Kỹ Năng",
    desc: "Xây dựng và chia sẻ bộ kỹ năng tối ưu cho mọi lối chơi.",
    icon: Combine,
    color: "from-emerald-500 to-green-500",
  },
];

/**
 * Module giới thiệu các công cụ hữu ích cho game thủ trên trang chủ.
 */
export function ToolsShowcase() {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
        Công Cụ Cho Game Thủ
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group relative block overflow-hidden rounded-2xl border border-border p-5 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
          >
            <div
              className={cn("absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-[2.5]", tool.color)}
            />
            <div className="relative">
              <div className={cn("mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white", tool.color)}>
                <tool.icon className="size-5" />
              </div>
              <p className="font-bold text-foreground">{tool.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}