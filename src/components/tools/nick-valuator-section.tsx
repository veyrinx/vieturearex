"use client";

import { useState } from "react";
import { FfPlayerLookup, type FfLookupData } from "@/components/tools/ff-player-lookup";
import { AccountValuator } from "@/components/tools/account-valuator";

// Map điểm rank BR -> key rank trong máy định giá (mirror /api/ff-info).
const RANK_BY_POINTS: { min: number; key: string }[] = [
  { min: 2600, key: "gm" },
  { min: 1900, key: "heroic" },
  { min: 1600, key: "diamond" },
  { min: 1400, key: "plat" },
  { min: 1200, key: "gold" },
  { min: 1000, key: "silver" },
  { min: 0, key: "bronze" },
];

function rankKeyFromPoints(points: number | null): string | null {
  if (points == null || !Number.isFinite(points)) return null;
  return RANK_BY_POINTS.find((r) => points >= r.min)?.key ?? null;
}

/**
 * Tra cứu UID (HL API) → hiển thị card chi tiết + TỰ ĐIỀN level & rank vào
 * máy ước tính nick, tính điểm ngay. Skin/đồ hiếm vẫn nhập tay (game không lộ).
 */
export function NickValuatorSection() {
  const [prefill, setPrefill] = useState<{ level: number | null; rankKey: string | null; nonce: number }>({
    level: null,
    rankKey: null,
    nonce: 0,
  });

  function handleData(d: FfLookupData) {
    setPrefill((prev) => ({
      level: d.level,
      rankKey: rankKeyFromPoints(d.brRankPoint),
      nonce: prev.nonce + 1,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Tra cứu dữ liệu THẬT từ UID (HL Gaming FF API) */}
      <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div>
          <h2 className="font-heading text-base font-black uppercase tracking-wide text-foreground">
            Tra cứu &amp; tự điền
          </h2>
          <p className="text-xs text-muted-foreground">
            Nhập UID để lấy dữ liệu thật từ máy chủ Free Fire — <b>tự điền level &amp; rank</b> vào bộ ước tính bên dưới.
            Skin/đồ hiếm vẫn nhập tay (game không lộ túi đồ).
          </p>
        </div>
        <FfPlayerLookup onData={handleData} />
      </section>

      <AccountValuator prefill={prefill} />
    </div>
  );
}
