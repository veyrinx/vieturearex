-- Thêm OB (phiên bản) + cờ Hot/Mới ra cho catalog item (/items).
-- Chạy 1 lần trên Supabase SQL editor. An toàn chạy lại (idempotent).
-- Depends on: public.ff_items_catalog (schema.sql)

alter table public.ff_items_catalog
  add column if not exists ob     text,
  add column if not exists is_hot boolean not null default false;

-- Giới hạn độ dài OB (vd: "OB48")
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ff_items_ob_length') then
    alter table public.ff_items_catalog
      add constraint ff_items_ob_length check (ob is null or char_length(ob) <= 20);
  end if;
end $$;

create index if not exists ff_items_hot_idx on public.ff_items_catalog (is_hot) where is_hot = true;
create index if not exists ff_items_ob_idx  on public.ff_items_catalog (ob)     where ob is not null;

comment on column public.ff_items_catalog.ob     is 'Phiên bản Free Fire item ra mắt (vd: OB48) — dùng lọc ở /items';
comment on column public.ff_items_catalog.is_hot is 'Admin gắn cờ Hot / Mới ra — hiện nhóm nổi bật ở /items';
