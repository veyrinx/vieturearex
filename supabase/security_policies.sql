-- ============================================================
-- security_policies.sql
-- Áp dụng toàn bộ RLS hardening lên production DB.
-- Không đụng bảng users — chạy an toàn khi đang có data.
-- Chạy trong Supabase SQL Editor (một lần, hoặc re-run bất kỳ lúc nào).
-- ============================================================

-- ── 1. HELPER: Sensitive setting keys ───────────────────────────────────────

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
revoke execute on function public.is_sensitive_setting_key(text) from anon, authenticated;

-- ── 2. SETTINGS ─────────────────────────────────────────────────────────────

drop policy if exists "Public can read settings"          on public.settings;
drop policy if exists "Public read non-sensitive settings" on public.settings;
drop policy if exists "Auth read non-sensitive settings"   on public.settings;
drop policy if exists "Admin read settings"                on public.settings;
drop policy if exists "Admin manage settings"              on public.settings;

-- Authenticated: chỉ đọc key không nhạy cảm
create policy "Auth read non-sensitive settings" on public.settings
  for select using (auth.uid() is not null and not public.is_sensitive_setting_key(key));

-- Admin: đọc tất cả
create policy "Admin read settings" on public.settings
  for select using (public.is_admin());

-- Admin: ghi tất cả
create policy "Admin manage settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 3. EVENTS ───────────────────────────────────────────────────────────────

drop policy if exists "Public can view events"  on public.events;
drop policy if exists "Auth can view events"    on public.events;
drop policy if exists "Admin/editor manage events" on public.events;

create policy "Auth can view events" on public.events
  for select using (auth.uid() is not null);

create policy "Admin/editor manage events" on public.events
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 4. NEWS ─────────────────────────────────────────────────────────────────

drop policy if exists "Public can view published news"  on public.news;
drop policy if exists "Auth can view published news"    on public.news;
drop policy if exists "Admin/editor manage news"        on public.news;

create policy "Auth can view published news" on public.news
  for select using (auth.uid() is not null and (status = 'published' or public.is_admin_or_editor()));

create policy "Admin/editor manage news" on public.news
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 5. GALLERY ──────────────────────────────────────────────────────────────

drop policy if exists "Public can view gallery"    on public.gallery;
drop policy if exists "Auth can view gallery"      on public.gallery;
drop policy if exists "Admin/editor manage gallery" on public.gallery;

create policy "Auth can view gallery" on public.gallery
  for select using (auth.uid() is not null);

create policy "Admin/editor manage gallery" on public.gallery
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 6. COMMENTS ─────────────────────────────────────────────────────────────

drop policy if exists "Public can view approved comments"  on public.news_comments;
drop policy if exists "Auth can view approved comments"    on public.news_comments;
drop policy if exists "Anyone can insert pending comment"  on public.news_comments;
drop policy if exists "Auth can insert pending comment"    on public.news_comments;
drop policy if exists "Admin manage comments"              on public.news_comments;

create policy "Auth can view approved comments" on public.news_comments
  for select using (auth.uid() is not null and (status = 'approved' or public.is_admin_or_editor()));

create policy "Auth can insert pending comment" on public.news_comments
  for insert with check (auth.uid() is not null and status = 'pending');

create policy "Admin manage comments" on public.news_comments
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 7. RATINGS ──────────────────────────────────────────────────────────────

drop policy if exists "Public can view ratings"  on public.news_ratings;
drop policy if exists "Auth can view ratings"    on public.news_ratings;
drop policy if exists "Anyone can submit rating" on public.news_ratings;
drop policy if exists "Auth can submit rating"   on public.news_ratings;
drop policy if exists "Admin manage ratings"     on public.news_ratings;

create policy "Auth can view ratings" on public.news_ratings
  for select using (auth.uid() is not null);

create policy "Auth can submit rating" on public.news_ratings
  for insert with check (auth.uid() is not null);

create policy "Admin manage ratings" on public.news_ratings
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 8. RATING LIKES ─────────────────────────────────────────────────────────

drop policy if exists "Public can view likes"       on public.rating_likes;
drop policy if exists "Auth can view likes"         on public.rating_likes;
drop policy if exists "Anyone can like"             on public.rating_likes;
drop policy if exists "Auth can like"               on public.rating_likes;
drop policy if exists "Anyone can remove own like"  on public.rating_likes;
drop policy if exists "Auth can remove own like"    on public.rating_likes;

create policy "Auth can view likes"      on public.rating_likes for select using (auth.uid() is not null);
create policy "Auth can like"            on public.rating_likes for insert with check (auth.uid() is not null);
create policy "Auth can remove own like" on public.rating_likes for delete using (auth.uid() is not null);

-- ── 9. RATING REPLIES ───────────────────────────────────────────────────────

drop policy if exists "Public can view replies"  on public.rating_replies;
drop policy if exists "Auth can view replies"    on public.rating_replies;
drop policy if exists "Admin can reply"          on public.rating_replies;
drop policy if exists "Admin manage replies"     on public.rating_replies;

create policy "Auth can view replies" on public.rating_replies
  for select using (auth.uid() is not null);

create policy "Admin can reply" on public.rating_replies
  for insert with check (public.is_admin_or_editor());

create policy "Admin manage replies" on public.rating_replies
  for delete using (public.is_admin_or_editor());

-- ── 10. TMS ─────────────────────────────────────────────────────────────────

drop policy if exists "tms public read teams"          on public.tms_teams;
drop policy if exists "tms auth read teams"            on public.tms_teams;
drop policy if exists "tms public read members"        on public.tms_team_members;
drop policy if exists "tms auth read members"          on public.tms_team_members;
drop policy if exists "tms public read tournaments"    on public.tms_tournaments;
drop policy if exists "tms auth read tournaments"      on public.tms_tournaments;
drop policy if exists "tms public read registrations"  on public.tms_registrations;
drop policy if exists "tms auth read registrations"    on public.tms_registrations;
drop policy if exists "tms public read matches"        on public.tms_matches;
drop policy if exists "tms auth read matches"          on public.tms_matches;
drop policy if exists "tms public read results"        on public.tms_match_results;
drop policy if exists "tms auth read results"          on public.tms_match_results;

create policy "tms auth read teams"         on public.tms_teams         for select using (auth.uid() is not null);
create policy "tms auth read members"       on public.tms_team_members  for select using (auth.uid() is not null);
create policy "tms auth read tournaments"   on public.tms_tournaments   for select using (auth.uid() is not null and (status <> 'draft' or public.is_admin()));
create policy "tms auth read registrations" on public.tms_registrations for select using (auth.uid() is not null);
create policy "tms auth read matches"       on public.tms_matches       for select using (auth.uid() is not null);
create policy "tms auth read results"       on public.tms_match_results for select using (auth.uid() is not null);

drop policy if exists "tms sub public insert" on public.tms_score_submissions;
create policy "tms auth insert submissions" on public.tms_score_submissions
  for insert with check (auth.uid() = user_id);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Sau khi chạy: anon key không đọc được bất kỳ bảng nào.
-- Service role (server-side app) bypass RLS hoàn toàn — không ảnh hưởng gì.
