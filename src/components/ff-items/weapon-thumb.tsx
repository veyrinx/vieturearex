"use client";

import { useState } from "react";
import Image from "next/image";
import { Crosshair, Swords, Target, Crown, Shield, Zap, Bomb, Hand, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Ảnh súng nền không có trong kho icon chính chủ, nên phần lớn vũ khí trong DB
// để image_url rỗng và link fallback sẽ 404. Component này bắt lỗi tải ảnh rồi
// vẽ biểu tượng theo thể loại — thư viện vũ khí trông vẫn liền mạch thay vì đầy
// icon ảnh vỡ. Ảnh thật tải lên trong /admin/weapons sẽ tự hiện đè lên.

const TYPE_ICON: Record<string, typeof Crosshair> = {
  ar: Crosshair,
  smg: Zap,
  sniper: Target,
  marksman: Target,
  shotgun: Swords,
  lmg: Shield,
  pistol: Crown,
  launcher: Bomb,
  melee: Hand,
  throwable: Sparkles,
};

type Props = {
  src: string;
  alt: string;
  size: number;
  weaponType?: string | null;
  className?: string;
  priority?: boolean;
};

export function WeaponThumb({ src, alt, size, weaponType, className, priority }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const Icon = TYPE_ICON[weaponType ?? ""] ?? Swords;
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
        <Icon style={{ width: size * 0.34, height: size * 0.34 }} className="opacity-60" />
        <span
          className="max-w-full truncate px-1 font-heading font-bold uppercase tracking-wide"
          style={{ fontSize: Math.max(8, size * 0.14) }}
        >
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("size-full object-contain p-1", className)}
    />
  );
}
