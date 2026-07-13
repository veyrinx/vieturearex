-- Phụ kiện gợi ý (JSONB trên ff_weapons) + bảng combo/loadout vũ khí.
-- Chạy 1 lần trên Supabase SQL editor. An toàn chạy lại (idempotent).

-- ── 1. Phụ kiện gợi ý cho mỗi vũ khí ────────────────────────
-- Mảng: [{ "slot": "muzzle", "name": "Giảm thanh", "note": "..." }]
alter table public.ff_weapons
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ── 2. Combo / loadout vũ khí ───────────────────────────────
create table if not exists public.ff_loadouts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name                text not null check (char_length(name) between 1 and 120),
  description         text,
  image_url           text,
  playstyle           text,                        -- rush | sniper | support | ...
  primary_weapon_id   uuid references public.ff_weapons(id) on delete set null,
  secondary_weapon_id uuid references public.ff_weapons(id) on delete set null,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ff_loadouts_slug_idx on public.ff_loadouts (slug);
create index if not exists ff_loadouts_position_idx on public.ff_loadouts (position);

-- updated_at trigger (reuse handle_updated_at)
drop trigger if exists ff_loadouts_updated_at on public.ff_loadouts;
create trigger ff_loadouts_updated_at before update on public.ff_loadouts
  for each row execute function public.handle_updated_at();

-- RLS: đọc công khai, ghi chỉ admin (khớp pattern ff_weapons)
alter table public.ff_loadouts enable row level security;

drop policy if exists ff_loadouts_public_read on public.ff_loadouts;
create policy ff_loadouts_public_read on public.ff_loadouts for select using (true);

drop policy if exists ff_loadouts_admin_write on public.ff_loadouts;
create policy ff_loadouts_admin_write on public.ff_loadouts
  for all using (public.is_admin()) with check (public.is_admin());
