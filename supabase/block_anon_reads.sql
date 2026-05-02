-- ============================================================
-- block_anon_reads.sql
-- Remove ALL anon/public SELECT policies.
-- Every table now requires auth.uid() IS NOT NULL to read.
-- App is unaffected: server-side fetches use service_role (bypasses RLS).
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ── EVENTS ──────────────────────────────────────────────────
drop policy if exists "Public can view events" on public.events;
create policy "Auth can view events" on public.events
  for select using (auth.uid() is not null);

-- ── NEWS ────────────────────────────────────────────────────
drop policy if exists "Public can view published news" on public.news;
create policy "Auth can view published news" on public.news
  for select using (auth.uid() is not null and status = 'published');

-- ── GALLERY ─────────────────────────────────────────────────
drop policy if exists "Public can view gallery" on public.gallery;
create policy "Auth can view gallery" on public.gallery
  for select using (auth.uid() is not null);

-- ── SETTINGS ────────────────────────────────────────────────
drop policy if exists "Public read non-sensitive settings" on public.settings;
create policy "Auth read non-sensitive settings" on public.settings
  for select using (auth.uid() is not null and not public.is_sensitive_setting_key(key));
-- "Admin read settings" already covers sensitive keys for admins — unchanged.

-- ── COMMENTS ────────────────────────────────────────────────
drop policy if exists "Public can view approved comments" on public.news_comments;
create policy "Auth can view approved comments" on public.news_comments
  for select using (auth.uid() is not null and status = 'approved');

drop policy if exists "Anyone can insert pending comment" on public.news_comments;
create policy "Auth can insert pending comment" on public.news_comments
  for insert with check (auth.uid() is not null);

-- ── RATINGS ─────────────────────────────────────────────────
drop policy if exists "Public can view ratings" on public.news_ratings;
create policy "Auth can view ratings" on public.news_ratings
  for select using (auth.uid() is not null);

drop policy if exists "Anyone can submit rating" on public.news_ratings;
create policy "Auth can submit rating" on public.news_ratings
  for insert with check (auth.uid() is not null);

-- ── RATING LIKES ────────────────────────────────────────────
drop policy if exists "Public can view likes" on public.rating_likes;
create policy "Auth can view likes" on public.rating_likes
  for select using (auth.uid() is not null);

drop policy if exists "Anyone can like" on public.rating_likes;
create policy "Auth can like" on public.rating_likes
  for insert with check (auth.uid() is not null);

drop policy if exists "Anyone can remove own like" on public.rating_likes;
create policy "Auth can remove own like" on public.rating_likes
  for delete using (auth.uid() is not null);

-- ── RATING REPLIES ───────────────────────────────────────────
drop policy if exists "Public can view replies" on public.rating_replies;
create policy "Auth can view replies" on public.rating_replies
  for select using (auth.uid() is not null);

-- ── TMS ─────────────────────────────────────────────────────
drop policy if exists "tms public read teams" on public.tms_teams;
create policy "tms auth read teams" on public.tms_teams
  for select using (auth.uid() is not null);

drop policy if exists "tms public read members" on public.tms_team_members;
create policy "tms auth read members" on public.tms_team_members
  for select using (auth.uid() is not null);

drop policy if exists "tms public read tournaments" on public.tms_tournaments;
create policy "tms auth read tournaments" on public.tms_tournaments
  for select using (auth.uid() is not null);

drop policy if exists "tms public read registrations" on public.tms_registrations;
create policy "tms auth read registrations" on public.tms_registrations
  for select using (auth.uid() is not null);

drop policy if exists "tms public read matches" on public.tms_matches;
create policy "tms auth read matches" on public.tms_matches
  for select using (auth.uid() is not null);

drop policy if exists "tms public read results" on public.tms_match_results;
create policy "tms auth read results" on public.tms_match_results
  for select using (auth.uid() is not null);

drop policy if exists "tms sub public insert" on public.tms_score_submissions;
create policy "tms auth insert submissions" on public.tms_score_submissions
  for insert with check (auth.uid() is not null);
