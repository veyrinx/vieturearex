"use client";

import { useEffect, useState } from "react";

type TocItem = { id: string; text: string; level: number };

export function NewsToc({ html }: { html: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings = Array.from(doc.querySelectorAll("h1,h2"));
    const toc: TocItem[] = headings
      .filter((h) => h.id) // chỉ lấy heading đã có id
      .map((h) => ({
        id: h.id,
        text: h.textContent ?? "",
        level: Number(h.tagName[1]),
      }));
    setItems(toc);
  }, [html]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mục lục</p>
      <div className="space-y-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top, behavior: "smooth" });
              }
            }}
            className={`relative flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:text-primary dark:hover:text-amber-400 ${
              active === item.id ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 font-semibold" : "text-muted-foreground"
            } ${item.level === 1 ? "font-semibold" : "pl-6 text-xs"}`}
          >
            {item.level > 1 && <span className="absolute left-3 top-3.5 h-1 w-1 rounded-full bg-current opacity-50" />}
            <span className="truncate uppercase">{item.text}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
