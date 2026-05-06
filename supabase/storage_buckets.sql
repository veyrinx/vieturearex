-- Create public storage buckets for team logos and tournament banners.
-- Run this in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values
  ('logos',  'logos',  true),
  ('events', 'events', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Authenticated upload logos'
  ) then
    create policy "Authenticated upload logos"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'logos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public read logos'
  ) then
    create policy "Public read logos"
      on storage.objects for select to public
      using (bucket_id = 'logos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Authenticated upload events'
  ) then
    create policy "Authenticated upload events"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'events');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public read events'
  ) then
    create policy "Public read events"
      on storage.objects for select to public
      using (bucket_id = 'events');
  end if;
end $$;
