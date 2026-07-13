-- Thêm thể loại (weapon_type) và phiên bản OB (ob) cho vũ khí.
-- Chạy 1 lần trên Supabase SQL editor.

alter table public.ff_weapons
  add column if not exists weapon_type text,
  add column if not exists ob text;

-- Ràng buộc thể loại hợp lệ (khớp WEAPON_TYPES trong code).
alter table public.ff_weapons
  drop constraint if exists ff_weapons_weapon_type_check;
alter table public.ff_weapons
  add constraint ff_weapons_weapon_type_check
  check (weapon_type is null or weapon_type in (
    'ar', 'smg', 'sniper', 'marksman', 'shotgun',
    'lmg', 'pistol', 'launcher', 'melee', 'throwable'
  ));

create index if not exists ff_weapons_weapon_type_idx
  on public.ff_weapons (weapon_type) where weapon_type is not null;
