"use client";

import { useState } from "react";
import { Link2, Check, Send, Facebook, Share2 } from "lucide-react";

type Props = {
  url: string;
  title: string;
  /** show only icons, no label */
  compact?: boolean;
  /** show "Chia sẻ:" label (default true) */
  showLabel?: boolean;
};

export function ShareButtons({ url, title, compact = false, showLabel = true }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => null);
  };

  const handleNativeShare = () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      navigator.share({ title, url }).catch(() => null);
    } else {
      copy();
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {showLabel && !compact && (
        <span className="text-xs text-muted-foreground mr-1">Chia sẻ:</span>
      )}

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

      {/* Native share (mobile) */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors dark:bg-amber-400/10 dark:hover:bg-amber-400/20"
          title="Chia sẻ"
        >
          <Share2 size={14} className="text-primary dark:text-amber-400" />
        </button>
      )}

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
