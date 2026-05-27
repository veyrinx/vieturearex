"use client";

import { useState } from "react";
import { Link2, Check, Send, Facebook } from "lucide-react";

type Props = { url: string; title: string };

export function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => null);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-1">Chia sẻ:</span>

      {/* Telegram */}
      <a
        href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center size-8 rounded-lg bg-[#2aabee]/10 hover:bg-[#2aabee]/20 transition-colors"
        title="Chia sẻ Telegram"
      >
        <Send size={14} className="text-[#2aabee]" />
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center size-8 rounded-lg bg-[#1877f2]/10 hover:bg-[#1877f2]/20 transition-colors"
        title="Chia sẻ Facebook"
      >
        <Facebook size={14} className="text-[#1877f2]" />
      </a>

      {/* Copy link */}
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center justify-center size-8 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        title={copied ? "Đã sao chép!" : "Sao chép link"}
      >
        {copied
          ? <Check size={14} className="text-green-500" />
          : <Link2 size={14} className="text-muted-foreground" />}
      </button>
    </div>
  );
}
