-- ============================================================
-- SECURITY PATCH: promote_to_super_admin + RLS hardening
-- Run this in Supabase SQL Editor (as super_admin / service role)
-- ============================================================

-- 1. Fix promote_to_super_admin: require caller to already be super_admin
create or replace function public.promote_to_super_admin(target_email text)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  user_uuid uuid;
begin
  select role into caller_role from public.users where id = auth.uid();
  if caller_role is distinct from 'super_admin' then
    return query select false::boolean, 'Không có quyền thực hiện thao tác này.'::text;
    return;
  end if;

  select id into user_uuid from auth.users where email = target_email;
  if user_uuid is null then
    return query select false::boolean, 'User không tồn tại trong auth.users.'::text;
    return;
  end if;

  update public.users set role = 'super_admin' where id = user_uuid;
  if found then
    return query select true::boolean, ('Đã gán role super_admin cho ' || target_email)::text;
  else
    insert into public.users (id, email, role) values (user_uuid, target_email, 'super_admin');
    return query select true::boolean, ('Đã tạo user ' || target_email || ' với role super_admin')::text;
  end if;
end;
$$;

-- 2. Revoke anon access to this function (unauthenticated callers cannot use it)
revoke execute on function public.promote_to_super_admin(text) from anon;
grant  execute on function public.promote_to_super_admin(text) to authenticated;

-- 3. Tighten "Admin manage users" policy: only super_admin/it/admin may write
drop policy if exists "Admin manage users" on public.users;
create policy "Admin manage users" on public.users
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('super_admin', 'admin', 'it')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('super_admin', 'admin', 'it')
    )
  );

-- Keep read access for all admins (manager/support need to see user list)
drop policy if exists "Admin read users" on public.users;
create policy "Admin read users" on public.users
  for select
  using (public.is_admin_or_editor());
