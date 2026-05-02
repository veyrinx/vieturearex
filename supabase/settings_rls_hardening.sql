-- ============================================================
-- settings_rls_hardening.sql
-- Block sensitive settings from public/anon reads.
-- Run once in Supabase SQL Editor.
-- ============================================================

-- Helper: returns true for keys that must not be readable by anon/public
create or replace function public.is_sensitive_setting_key(k text)
returns boolean
language sql immutable security definer
set search_path = public
as $$
  select k = any(array[
    'mail.smtp_pass',
    'mail.smtp_user',
    'mail.smtp_host',
    'mail.from_email',
    'site.discord_webhook',
    'zalo.webhook_url',
    'zalo.group_id',
    'ads.google_adsense_id',
    'ads.slot_header',
    'ads.slot_sidebar',
    'ads.slot_article',
    'integrations.lark_webhook_url',
    'integrations.lark_alerts_webhook_url',
    'tms.payment_info'
  ]);
$$;

-- Revoke direct anon/authenticated execution (only called via SECURITY DEFINER)
revoke execute on function public.is_sensitive_setting_key(text) from anon, authenticated;

-- ── Replace the open "Public can read settings" policy ──────────────────────

drop policy if exists "Public can read settings" on public.settings;

-- Public (anon + authenticated non-admin) can read only non-sensitive keys
create policy "Public read non-sensitive settings" on public.settings
  for select
  using (not public.is_sensitive_setting_key(key));

-- Admins can read ALL settings (including sensitive)
drop policy if exists "Admin read settings" on public.settings;
create policy "Admin read settings" on public.settings
  for select
  using (public.is_admin());

-- "Admin manage settings" already covers INSERT/UPDATE/DELETE for admins — keep it.
-- (No change needed to that policy.)
