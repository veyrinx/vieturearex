import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_META, splitSkill, type CharacterListItem } from "@/lib/data/ff-characters";

/**
 * Khối "Meta hiện tại" đầu trang /characters: nổi bật nhân vật tier S.
 * Server component — chỉ hiển thị khi có nhân vật tier S.
 */
export function CharactersMetaHighlight({ characters }: { characters: CharacterListItem[] }) {
  const top = characters.filter((c) => c.tier === "S").slice(0, 6);
  if (top.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-black uppercase tracking-[0.15em] text-foreground">
          Meta hiện tại · Tier S
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {top.map((c) => {
          const skill = splitSkill(c.skill);
          return (
            <Link
              key={c.slug}
              href={`/characters/${c.slug}`}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50"
            >
              <div className="size-16 overflow-hidden rounded-xl bg-muted/40">
                {c.image ? (
                  <Image src={c.image} alt={c.name} width={64} height={64} className="size-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xl font-black text-muted-foreground">{c.name.slice(0, 1)}</div>
                )}
              </div>
              <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">{c.name}</p>
              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", ROLE_META[c.role].bg, ROLE_META[c.role].text)}>
                {ROLE_META[c.role].label}
              </span>
              <p className="truncate text-[10px] text-muted-foreground">{skill.name}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
