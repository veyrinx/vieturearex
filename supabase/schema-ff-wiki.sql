-- ============================================================
-- FF WIKI: Weapons + DB-backed Tier Lists + item interactions
-- Additive migration. Safe to run on top of schema.sql (idempotent).
-- Depends on: public.users, public.is_admin()
-- ============================================================

-- ── Weapons catalog ─────────────────────────────────────────
create table if not exists public.ff_weapons (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name          text not null check (char_length(name) between 1 and 120),
  description   text,
  image_url     text not null,
  damage        integer,
  range         integer,
  rate_of_fire  integer,
  reload        integer,
  magazine      integer,
  weapon_type   text check (weapon_type is null or weapon_type in (
    'ar', 'smg', 'sniper', 'marksman', 'shotgun',
    'lmg', 'pistol', 'launcher', 'melee', 'throwable'
  )),
  ob            text,
  attachments   jsonb not null default '[]'::jsonb,  -- [{ slot, name, note }]
  released_at   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ff_weapons_slug_idx on public.ff_weapons (slug);
create index if not exists ff_weapons_weapon_type_idx on public.ff_weapons (weapon_type) where weapon_type is not null;

-- ── Combo / loadout vũ khí ──────────────────────────────────
create table if not exists public.ff_loadouts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name                text not null check (char_length(name) between 1 and 120),
  description         text,
  image_url           text,
  playstyle           text,
  primary_weapon_id   uuid references public.ff_weapons(id) on delete set null,
  secondary_weapon_id uuid references public.ff_weapons(id) on delete set null,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ff_loadouts_slug_idx on public.ff_loadouts (slug);
create index if not exists ff_loadouts_position_idx on public.ff_loadouts (position);

-- ── Tier lists (character | weapon) ─────────────────────────
create table if not exists public.tier_lists (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('character', 'weapon')),
  patch       text not null,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tier_list_entries (
  id            uuid primary key default gen_random_uuid(),
  tier_list_id  uuid not null references public.tier_lists(id) on delete cascade,
  ref_id        uuid,                        -- optional link to ff_weapons.id (for weapon detail pages)
  name          text not null,               -- denormalized display name (weapon or character)
  image_url     text not null,               -- denormalized display image
  tier          text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists tier_list_entries_list_idx on public.tier_list_entries (tier_list_id);
create index if not exists tier_list_entries_ref_idx  on public.tier_list_entries (ref_id);

-- ── Item comments (weapons, characters, …) ──────────────────
create table if not exists public.item_comments (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null,
  user_id     uuid not null references public.users(id) on delete cascade,
  content     text not null check (char_length(content) between 2 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists item_comments_item_idx on public.item_comments (item_id, created_at desc);

-- ── Item ratings (1..5, one per user per item) ──────────────
create table if not exists public.item_ratings (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null,
  user_id     uuid not null references public.users(id) on delete cascade,
  stars       integer not null check (stars between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(item_id, user_id)
);

create index if not exists item_ratings_item_idx on public.item_ratings (item_id);

-- ── updated_at trigger (reuse handle_updated_at from schema.sql) ──
drop trigger if exists ff_weapons_updated_at on public.ff_weapons;
create trigger ff_weapons_updated_at before update on public.ff_weapons
  for each row execute function public.handle_updated_at();

drop trigger if exists tier_lists_updated_at on public.tier_lists;
create trigger tier_lists_updated_at before update on public.tier_lists
  for each row execute function public.handle_updated_at();

drop trigger if exists ff_loadouts_updated_at on public.ff_loadouts;
create trigger ff_loadouts_updated_at before update on public.ff_loadouts
  for each row execute function public.handle_updated_at();

drop trigger if exists item_ratings_updated_at on public.item_ratings;
create trigger item_ratings_updated_at before update on public.item_ratings
  for each row execute function public.handle_updated_at();

-- ── Ratings aggregate RPC ───────────────────────────────────
-- Returns a single JSON object: { average_rating, rating_count, user_rating }.
-- user_rating is the calling user's own rating (null when unauthenticated).
create or replace function public.get_item_ratings(p_item_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'average_rating', coalesce(round(avg(stars)::numeric, 2), 0),
    'rating_count',   count(*),
    'user_rating',    (
      select stars from public.item_ratings
      where item_id = p_item_id and user_id = auth.uid()
      limit 1
    )
  )
  from public.item_ratings
  where item_id = p_item_id;
$$;

grant execute on function public.get_item_ratings(uuid) to anon, authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table public.ff_weapons        enable row level security;
alter table public.ff_loadouts       enable row level security;
alter table public.tier_lists        enable row level security;
alter table public.tier_list_entries enable row level security;
alter table public.item_comments     enable row level security;
alter table public.item_ratings      enable row level security;

-- Public read
drop policy if exists ff_weapons_public_read on public.ff_weapons;
create policy ff_weapons_public_read on public.ff_weapons for select using (true);

drop policy if exists ff_loadouts_public_read on public.ff_loadouts;
create policy ff_loadouts_public_read on public.ff_loadouts for select using (true);

drop policy if exists tier_lists_public_read on public.tier_lists;
create policy tier_lists_public_read on public.tier_lists for select using (true);

drop policy if exists tier_list_entries_public_read on public.tier_list_entries;
create policy tier_list_entries_public_read on public.tier_list_entries for select using (true);

drop policy if exists item_comments_public_read on public.item_comments;
create policy item_comments_public_read on public.item_comments for select using (true);

drop policy if exists item_ratings_public_read on public.item_ratings;
create policy item_ratings_public_read on public.item_ratings for select using (true);

-- Admin write (weapons + tier lists)
drop policy if exists ff_weapons_admin_write on public.ff_weapons;
create policy ff_weapons_admin_write on public.ff_weapons for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists ff_loadouts_admin_write on public.ff_loadouts;
create policy ff_loadouts_admin_write on public.ff_loadouts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists tier_lists_admin_write on public.tier_lists;
create policy tier_lists_admin_write on public.tier_lists for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists tier_list_entries_admin_write on public.tier_list_entries;
create policy tier_list_entries_admin_write on public.tier_list_entries for all using (public.is_admin()) with check (public.is_admin());

-- Comments: user inserts/deletes own; admins moderate
drop policy if exists item_comments_insert_own on public.item_comments;
create policy item_comments_insert_own on public.item_comments for insert with check (auth.uid() = user_id);

drop policy if exists item_comments_delete_own on public.item_comments;
create policy item_comments_delete_own on public.item_comments for delete using (auth.uid() = user_id or public.is_admin());

-- Ratings: user upserts/deletes own
drop policy if exists item_ratings_insert_own on public.item_ratings;
create policy item_ratings_insert_own on public.item_ratings for insert with check (auth.uid() = user_id);

drop policy if exists item_ratings_update_own on public.item_ratings;
create policy item_ratings_update_own on public.item_ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists item_ratings_delete_own on public.item_ratings;
create policy item_ratings_delete_own on public.item_ratings for delete using (auth.uid() = user_id or public.is_admin());
