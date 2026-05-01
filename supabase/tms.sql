,-- ============================================================
-- AREX TMS – Tournament Management System
-- Chạy sau schema.sql chính
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.tms_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  tag         text not null unique,
  captain_id  uuid not null references public.users(id) on delete restrict,
  logo_url    text,
  total_points integer not null default 0,
  total_kills  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tms_teams_tag_length check (char_length(tag) between 2 and 8)
);

create table if not exists public.tms_team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.tms_teams(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- 1 user chỉ được ở 1 team cùng lúc
create unique index if not exists tms_team_members_user_unique on public.tms_team_members(user_id);

create table if not exists public.tms_tournaments (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  slug                    text not null unique,
  description             text,
  mode                    text not null default '4v4'
                            check (mode in ('1v1','2v2','4v4','squad')),
  format                  text not null default 'hybrid'
                            check (format in ('round_robin','knockout','hybrid')),
  max_teams               integer not null default 16,
  team_size               integer not null default 4,
  prize_pool              text,
  rules                   text,
  banner_url              text,
  status                  text not null default 'draft'
                            check (status in ('draft','registering','ongoing','finished','cancelled')),
  registration_open_at    timestamptz,
  registration_close_at   timestamptz,
  start_at                timestamptz,
  end_at                  timestamptz,
  created_by              uuid references public.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.tms_registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tms_tournaments(id) on delete cascade,
  team_id       uuid not null references public.tms_teams(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  group_label   text,
  registered_at timestamptz not null default now(),
  unique(tournament_id, team_id)
);

create table if not exists public.tms_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tms_tournaments(id) on delete cascade,
  round         text not null,
  round_num     integer not null default 1,
  team_a_id     uuid not null references public.tms_teams(id),
  team_b_id     uuid not null references public.tms_teams(id),
  scheduled_at  timestamptz,
  status        text not null default 'pending'
                  check (status in ('pending','playing','done','cancelled')),
  winner_id     uuid references public.tms_teams(id),
  proof_url     text,
  notes         text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tms_matches_teams_different check (team_a_id <> team_b_id)
);

-- Kết quả từng player trong match (admin nhập sau trận)
create table if not exists public.tms_match_results (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.tms_matches(id) on delete cascade,
  tournament_id uuid not null references public.tms_tournaments(id),
  team_id       uuid not null references public.tms_teams(id),
  user_id       uuid not null references public.users(id),
  kills         integer not null default 0 check (kills >= 0 and kills <= 99),
  assists       integer not null default 0 check (assists >= 0 and assists <= 99),
  deaths        integer not null default 0 check (deaths >= 0 and deaths <= 99),
  is_winner     boolean not null default false,
  -- kills×2 + assists×1 + win_bonus(20) or consolation(8)
  points        integer generated always as (
    (kills * 2) + assists + (case when is_winner then 20 else 8 end)
  ) stored,
  submitted_by  uuid references public.users(id),
  created_at    timestamptz not null default now(),
  unique(match_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists tms_team_members_team_idx   on public.tms_team_members(team_id);
create index if not exists tms_registrations_tourn_idx on public.tms_registrations(tournament_id);
create index if not exists tms_registrations_team_idx  on public.tms_registrations(team_id);
create index if not exists tms_matches_tourn_idx       on public.tms_matches(tournament_id);
create index if not exists tms_matches_status_idx      on public.tms_matches(status);
create index if not exists tms_match_results_match_idx on public.tms_match_results(match_id);
create index if not exists tms_match_results_user_idx  on public.tms_match_results(user_id);
create index if not exists tms_match_results_tourn_idx on public.tms_match_results(tournament_id);
create index if not exists tms_tournaments_slug_idx    on public.tms_tournaments(slug);
create index if not exists tms_tournaments_status_idx  on public.tms_tournaments(status);

-- ============================================================
-- LEADERBOARD VIEWS
-- ============================================================

create or replace view public.tms_player_leaderboard as
select
  r.tournament_id,
  r.user_id,
  u.display_name,
  r.team_id,
  t.name  as team_name,
  t.tag   as team_tag,
  count(distinct r.match_id)        as matches_played,
  sum(r.kills)                      as total_kills,
  sum(r.assists)                    as total_assists,
  sum(r.deaths)                     as total_deaths,
  sum(r.points)                     as total_points,
  count(*) filter (where r.is_winner) as wins,
  round(
    case when sum(r.deaths) = 0 then sum(r.kills)::numeric
    else sum(r.kills)::numeric / sum(r.deaths)::numeric end, 2
  ) as kd_ratio
from public.tms_match_results r
join public.users u on u.id = r.user_id
join public.tms_teams t on t.id = r.team_id
group by r.tournament_id, r.user_id, u.display_name, r.team_id, t.name, t.tag;

create or replace view public.tms_team_leaderboard as
select
  r.tournament_id,
  r.team_id,
  t.name  as team_name,
  t.tag   as team_tag,
  t.logo_url,
  count(distinct m.id)                           as matches_played,
  count(distinct m.id) filter (where m.winner_id = r.team_id) as wins,
  count(distinct m.id) filter (where m.winner_id is not null and m.winner_id <> r.team_id) as losses,
  sum(r.kills)                                   as total_kills,
  sum(r.assists)                                 as total_assists,
  sum(r.points)                                  as total_points
from public.tms_match_results r
join public.tms_teams t on t.id = r.team_id
join public.tms_matches m on m.id = r.match_id
group by r.tournament_id, r.team_id, t.name, t.tag, t.logo_url;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists on_tms_tournaments_updated on public.tms_tournaments;
create trigger on_tms_tournaments_updated
before update on public.tms_tournaments
for each row execute function public.handle_updated_at();

drop trigger if exists on_tms_teams_updated on public.tms_teams;
create trigger on_tms_teams_updated
before update on public.tms_teams
for each row execute function public.handle_updated_at();

drop trigger if exists on_tms_matches_updated on public.tms_matches;
create trigger on_tms_matches_updated
before update on public.tms_matches
for each row execute function public.handle_updated_at();

-- Auto-sync team totals after match result insert/delete
create or replace function public.tms_sync_team_totals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tms_teams set
    total_points = coalesce((select sum(points) from public.tms_match_results where team_id = coalesce(new.team_id, old.team_id)), 0),
    total_kills  = coalesce((select sum(kills)  from public.tms_match_results where team_id = coalesce(new.team_id, old.team_id)), 0)
  where id = coalesce(new.team_id, old.team_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_tms_result_upsert on public.tms_match_results;
create trigger on_tms_result_upsert
after insert or update or delete on public.tms_match_results
for each row execute function public.tms_sync_team_totals();

-- ============================================================
-- RLS
-- ============================================================

alter table public.tms_teams         enable row level security;
alter table public.tms_team_members  enable row level security;
alter table public.tms_tournaments   enable row level security;
alter table public.tms_registrations enable row level security;
alter table public.tms_matches       enable row level security;
alter table public.tms_match_results enable row level security;

-- Public read
drop policy if exists "tms public read teams"         on public.tms_teams;
create policy "tms public read teams"         on public.tms_teams for select using (true);

drop policy if exists "tms public read members"       on public.tms_team_members;
create policy "tms public read members"       on public.tms_team_members for select using (true);

drop policy if exists "tms public read tournaments"   on public.tms_tournaments;
create policy "tms public read tournaments"   on public.tms_tournaments for select
  using (status <> 'draft' or public.is_admin());

drop policy if exists "tms public read registrations" on public.tms_registrations;
create policy "tms public read registrations" on public.tms_registrations for select using (true);

drop policy if exists "tms public read matches"       on public.tms_matches;
create policy "tms public read matches"       on public.tms_matches for select using (true);

drop policy if exists "tms public read results"       on public.tms_match_results;
create policy "tms public read results"       on public.tms_match_results for select using (true);

-- Authenticated users can create / manage their own team
drop policy if exists "tms user create team"         on public.tms_teams;
create policy "tms user create team" on public.tms_teams for insert
  with check (captain_id = auth.uid());

drop policy if exists "tms captain update team"      on public.tms_teams;
create policy "tms captain update team" on public.tms_teams for update
  using (captain_id = auth.uid() or public.is_admin());

-- Team members: join / leave
drop policy if exists "tms user join team"           on public.tms_team_members;
create policy "tms user join team" on public.tms_team_members for insert
  with check (user_id = auth.uid());

drop policy if exists "tms user leave team"          on public.tms_team_members;
create policy "tms user leave team" on public.tms_team_members for delete
  using (user_id = auth.uid() or public.is_admin());

-- Registrations: authenticated users
drop policy if exists "tms user register team"       on public.tms_registrations;
create policy "tms user register team" on public.tms_registrations for insert
  with check (
    exists (select 1 from public.tms_teams where id = team_id and captain_id = auth.uid())
  );

-- Admin-only: write tournaments, matches, results
drop policy if exists "tms admin manage tournaments"  on public.tms_tournaments;
create policy "tms admin manage tournaments" on public.tms_tournaments for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage registrations" on public.tms_registrations;
create policy "tms admin manage registrations" on public.tms_registrations for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage matches"      on public.tms_matches;
create policy "tms admin manage matches" on public.tms_matches for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage results"      on public.tms_match_results;
create policy "tms admin manage results" on public.tms_match_results for all
  using (public.is_admin()) with check (public.is_admin());
