# Arex API Reference

Base URL: `https://arexnetwork.site/api`

All endpoints return JSON. Rate limits are per IP, per minute, and respond with `429` when exceeded.

---

## Authentication

Most endpoints use Supabase session cookies (set by `@supabase/ssr`). Admin endpoints additionally require an `admin_capability` or `minimumRole` check server-side.

**Roles (ascending):** `user` → `support` → `manager` → `it` → `admin` → `super_admin`

---

## Public Endpoints

No authentication required.

### News

#### `GET /api/news`
List published news articles.

| Query | Type | Default | Description |
|---|---|---|---|
| `status` | `published \| draft \| all` | `published` | Filter by status (draft/all requires admin session) |

**Response**
```json
{ "news": [ { "id": "uuid", "title": "...", "slug": "...", "excerpt": "...", "category": "...", "status": "published", "created_at": "..." } ] }
```

**Rate limit:** 100/min

---

#### `GET /api/news/[newsId]/comments`
List approved comments for a news article.

**Response**
```json
{ "comments": [ { "id": "uuid", "user_id": "uuid|null", "display_name": "...", "content": "...", "status": "approved", "created_at": "...", "parent_id": "uuid|null", "avatar_url": "url|null" } ] }
```

---

#### `GET /api/news/ratings`
List ratings for news.

| Query | Type | Description |
|---|---|---|
| `news_id` | `string` | Filter by news ID |

---

### Events

#### `GET /api/events`
List events.

| Query | Type | Description |
|---|---|---|
| `search` | `string` | Keyword search |
| `status` | `upcoming \| ongoing \| ended \| all` | Filter by status |

**Response**
```json
{ "events": [ { "id": "uuid", "title": "...", "description": "...", "start_date": "...", "status": "...", "server_region": "..." } ] }
```

**Rate limit:** 100/min

---

#### `GET /api/events/[id]/comments`
List approved comments for an event. Same shape as news comments.

---

### Search

#### `GET /api/search`
Full-text search across news and events (server-side, uses Supabase `ilike`).

| Query | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | — | Search keyword (min 2 chars) |
| `type` | `all \| news \| event` | `all` | Scope |
| `limit` | `number` | `20` (max `50`) | Result count |
| `category` | `string` | — | Filter news by category |

**Response**
```json
{
  "results": [
    {
      "type": "news",
      "id": "uuid",
      "title": "...",
      "description": "...",
      "date": "...",
      "href": "/news/slug",
      "status": "published",
      "category": "...",
      "slug": "..."
    }
  ]
}
```

**Rate limit:** 30/min

---

### Streams

#### `GET /api/streams`
List all streams (live + scheduled).

**Response**
```json
{ "streams": [ { "id": "uuid", "title": "...", "platform": "youtube|twitch", "stream_url": "...", "status": "live|scheduled|ended" } ] }
```

**Rate limit:** 100/min

---

### Gallery

#### `GET /api/gallery`
List public gallery items.

**Rate limit:** 100/min

---

### Misc

#### `GET /api/maintenance-info`
Returns current maintenance message and end time.

**Response**
```json
{ "message": "...", "endTime": "ISO8601|null" }
```

**Rate limit:** 30/min

---

#### `GET /api/image-proxy`
Proxy images from an allowlist of external hostnames.

| Query | Type | Description |
|---|---|---|
| `url` | `string` | HTTPS image URL (must be on allowlist) |

Allowed hostnames: `dl.dir.freefiremobile.com`, `images.unsplash.com`, `cdn.discordapp.com`, `i.ytimg.com`, `upload.wikimedia.org`

**Rate limit:** 30/min · **Cache:** 7 days (`Cache-Control: public, immutable`)

---

#### `POST /api/contact`
Submit a contact form. Sends email to site contact address.

**Body**
```json
{ "name": "string", "email": "email", "message": "string (max 2000)" }
```

**Rate limit:** 12/min

---

## Authenticated Endpoints

Requires valid Supabase session (cookie-based).

### User

#### `GET /api/user/me`
Returns current user's role and permission flags. Also awards daily login points (silent).

**Response**
```json
{ "role": "admin|support|...|null", "isAdmin": true, "canEdit": false }
```

**Rate limit:** 60/min · **Cache:** `private, no-store`

---

#### `GET /api/user/profile`
Get full profile of the authenticated user.

#### `PATCH /api/user/profile`
Update profile fields.

**Body** (all optional)
```json
{
  "display_name": "string (max 80)",
  "bio": "string (max 300)",
  "phone": "string (max 20)",
  "contact_email": "email",
  "ff_id": "6–12 digit string",
  "game_profiles": [ { "game": "...", "uid": "...", "nickname": "...", "custom_label": "..." } ],
  "facebook_url": "url",
  "tiktok_url": "url",
  "instagram_url": "url",
  "youtube_url": "url",
  "website_url": "url"
}
```

**Rate limit:** 30/min

---

#### `POST /api/user/avatar`
Upload avatar image. Stores in Supabase Storage bucket `avatars`.

**Body:** `multipart/form-data` with `file` (image, max 5 MB)

**Rate limit:** 10/min

---

#### `POST /api/user/award-view`
Award points to authenticated user for reading content.

**Rate limit:** 20/min

---

#### `GET /api/user/login-logs`
Get login history for the authenticated user.

---

### Notifications

#### `GET /api/notifications`
List notifications for authenticated user.

| Query | Type | Description |
|---|---|---|
| `count` | `true` | Return only `{ count: N }` unread count |

**Rate limit:** 60/min

#### `PATCH /api/notifications`
Mark notification(s) as read.

**Body**
```json
{ "id": "uuid" }
```
or
```json
{ "all": true }
```

**Rate limit:** 30/min

---

### Comments

#### `POST /api/news/[newsId]/comments`
Post a comment on a news article. Comment goes through content filter — may be auto-approved or sent to pending queue.

**Body**
```json
{ "content": "string (max 500)", "parent_id": "uuid|null" }
```

**Rate limit:** 5/min

**Response on pending:**
```json
{ "ok": true, "pending": true, "message": "..." }
```

---

#### `POST /api/events/[id]/comments`
Post a comment on an event. Same schema as news comments.

**Rate limit:** 5/min

---

### Ratings

#### `POST /api/news/rating`
Rate a news article (1–5 stars).

**Body**
```json
{ "news_id": "uuid", "rating": 1-5, "comment": "string (optional)" }
```

---

#### `POST /api/news/ratings/like`
Like/unlike a news rating.

**Body**
```json
{ "rating_id": "uuid" }
```

---

### Polls

#### `GET /api/polls`
List active polls. Requires authenticated session.

| Query | Type | Default | Description |
|---|---|---|---|
| `entity_type` | `event \| news \| global` | — | Filter by entity type |
| `entity_id` | `uuid` | — | Filter by entity |
| `active` | `false` | `true` | Include closed polls |

**Rate limit:** 30/min

---

#### `GET /api/polls/[pollId]`
Get poll detail with vote counts and user's existing vote.

**Response**
```json
{
  "id": "uuid",
  "question": "...",
  "status": "active|closed",
  "ends_at": "ISO8601|null",
  "options": [ { "id": "uuid", "label": "...", "votes": 12, "percent": 40 } ],
  "totalVotes": 30,
  "myVote": "option-uuid|null"
}
```

**Rate limit:** 30/min

---

#### `POST /api/polls/[pollId]/vote`
Submit a vote.

**Body**
```json
{ "option_id": "uuid" }
```

**Rate limit:** 10/min

---

### Support Chat

#### `GET /api/support/session`
Get or list support sessions for the authenticated user.

#### `POST /api/support/session`
Create a new support session.

**Body**
```json
{ "subject": "string", "message": "string" }
```

---

#### `GET /api/support/session/[sessionId]/messages`
Get messages in a support session.

#### `POST /api/support/session/[sessionId]/messages`
Send a message in a support session.

**Body**
```json
{ "content": "string" }
```

---

### Push Notifications

#### `POST /api/push/subscribe`
Subscribe device to web push notifications.

**Body:** PushSubscription JSON from browser's `registration.pushManager.subscribe()`

---

### Upload

#### `POST /api/upload`
Upload an image to Supabase Storage bucket `logos`.

**Body:** `multipart/form-data` with `file` (image, max 5 MB) and optional `bucket` (only `logos` allowed)

**Response**
```json
{ "publicUrl": "https://..." }
```

**Rate limit:** 20/min

---

### TMS (Tournament Management System)

#### `GET /api/tms/tournaments`
List all tournaments (public).

#### `GET /api/tms/tournaments/[id]`
Tournament detail.

#### `GET /api/tms/tournaments/[id]/registrations`
List team registrations for a tournament.

---

#### `GET /api/tms/matches`
List matches. Optional query params for filtering.

#### `GET /api/tms/matches/[id]`
Match detail including teams, scores, and result.

---

#### `GET /api/tms/teams`
List all teams.

#### `GET /api/tms/teams/[id]`
Team detail.

#### `POST /api/tms/teams/[id]/join`
Request to join a team.

#### `GET /api/tms/teams/[id]/members`
List team members.

---

#### `GET /api/tms/players/[userId]`
Get TMS player profile for a user.

---

#### `GET /api/tms/submissions`
List match result submissions.

---

## Admin Endpoints

Require admin session. Minimum role noted per endpoint.

### Content Management

#### `GET /api/admin/news` · Role: `support`
List all news (all statuses).

#### `POST /api/admin/news` · Role: `it`
Create news article.

#### `PATCH /api/admin/news` · Role: `it`
Update news article.

#### `DELETE /api/admin/news` · Role: `admin`
Delete news article.

---

#### `GET /api/admin/events` · Role: `support`
List all events.

#### `POST /api/admin/events` · Role: `it`
Create event.

#### `PATCH /api/admin/events` · Role: `it`
Update event.

#### `DELETE /api/admin/events` · Role: `admin`
Delete event.

---

### Comments Moderation

**Rate limit:** GET 120/min · PATCH/DELETE 60/min

#### `GET /api/admin/comments` · Role: `support`
List comments.

| Query | Type | Default | Description |
|---|---|---|---|
| `status` | `pending \| approved \| rejected \| all` | `pending` | Filter by status |
| `table` | `news_comments \| event_comments` | `news_comments` | Target table |

#### `PATCH /api/admin/comments` · Capability: `comments.moderate`
Bulk approve/reject comments. Sends in-app notification to users on approve. Triggers `revalidatePath` for affected pages.

**Body**
```json
{ "ids": ["uuid", "..."], "status": "approved|rejected|pending", "table": "news_comments" }
```
or single: `{ "id": "uuid", ... }`

#### `DELETE /api/admin/comments` · Capability: `comments.moderate`
Delete a comment permanently.

**Body**
```json
{ "id": "uuid", "table": "news_comments" }
```

---

### Ratings Moderation

#### `GET /api/admin/ratings` · Role: `support`
List all news ratings.

#### `POST /api/admin/ratings/reply` · Role: `support`
Reply to a rating. Sends in-app notification to rating author.

**Body**
```json
{ "rating_id": "uuid", "content": "string" }
```

---

### Users

#### `GET /api/admin/users` · Role: `support`
List all users.

#### `POST /api/admin/create-account` · Role: `admin`
Create a new admin account (requires invited email).

#### `POST /api/admin/users/reset-password` · Role: `admin`
Send password reset email to a user.

#### `POST /api/admin/users/signout` · Role: `admin`
Force sign out a user session.

#### `GET /api/admin/users/verify` · Role: `admin`
Get user verification status.

---

### Activity Logs

#### `GET /api/admin/logs` · Role: `support`
Query activity logs (default: last 48h, auto-delete after 48h).

| Query | Type | Description |
|---|---|---|
| `from` | `YYYY-MM-DD` | Start date (inclusive) |
| `to` | `YYYY-MM-DD` | End date (inclusive, 23:59:59) |
| `action` | `string` | Filter by action name (partial match) |

**Rate limit:** 80/min

**Response**
```json
{ "logs": [ { "id": "uuid", "action": "NEWS_CREATED", "actor_email": "...", "target_type": "NEWS", "target_id": "uuid", "summary": "...", "ip": "...", "created_at": "..." } ] }
```

---

### Statistics

#### `GET /api/admin/stats` · Role: `support`
Full stats dashboard: page views chart (30d), by year/month, top news by comments, points leaderboard.

**Rate limit:** 60/min

---

#### `GET /api/admin/stats/today` · Role: `support`
Today's activity counts (VN timezone).

**Response**
```json
{ "newUsers": 3, "newNews": 1, "newEvents": 0, "pendingComments": 12 }
```

**Rate limit:** 60/min

---

### Analytics

#### `GET /api/analytics/trends` · Role: `support`
View trends: today/yesterday views, week/month comparisons, last 30d chart.

**Rate limit:** 60/min

---

### Settings

#### `GET /api/admin/settings` · Role: `support`
Get all site settings as key-value pairs.

#### `PATCH /api/admin/settings` · Role: `admin`
Update a setting.

**Body**
```json
{ "key": "setting.key", "value": "..." }
```

---

### Streams

#### `GET /api/admin/streams` · Role: `support`
List all streams.

#### `POST /api/admin/streams` · Role: `it`
Create stream. Sends multi-channel notification (Telegram, Discord, Lark, Push).

#### `PATCH /api/admin/streams` · Role: `it`
Update stream. Sends live notification when `status` changes to `"live"`.

#### `DELETE /api/admin/streams` · Role: `it`
Delete stream.

---

### Gallery

#### `GET /api/admin/gallery` · Role: `support`
List gallery items.

#### `POST /api/admin/gallery` · Role: `it`
Add gallery item.

---

### Polls

#### `POST /api/polls` · Role: `admin`
Create a poll.

**Body**
```json
{
  "question": "string (5–200 chars)",
  "options": ["option 1", "option 2"],
  "entity_type": "event|news|global",
  "entity_id": "uuid",
  "ends_at": "ISO8601|null"
}
```

#### `PATCH /api/polls/[pollId]` · Role: `admin`
Update poll status (`active` or `closed`).

#### `DELETE /api/polls/[pollId]` · Role: `admin`
Delete a poll.

---

### Notifications (Push)

#### `POST /api/push/send` · Role: `admin`
Send push notification to all subscribers.

**Body**
```json
{ "title": "...", "body": "...", "url": "/relative-path" }
```

---

### Support

#### `GET /api/admin/support` · Role: `support`
List all support sessions.

#### `POST /api/admin/support/reply` · Role: `support`
Reply to a support session.

**Body**
```json
{ "session_id": "uuid", "content": "string" }
```

---

### Security

#### `GET /api/admin/security` · Role: `admin`
List recent security events (failed logins, suspicious activity).

---

### TMS (Admin)

#### `POST /api/tms/tournaments` · Role: `admin`
Create tournament.

#### `PATCH /api/tms/tournaments/[id]` · Role: `admin`
Update tournament.

#### `POST /api/tms/tournaments/[id]/generate-matches` · Role: `admin`
Generate bracket/match schedule for a tournament.

#### `PATCH /api/tms/matches/[id]` · Role: `admin`
Update match details.

#### `POST /api/tms/matches/[id]/results` · Role: `admin`
Submit match results. Sends in-app notifications to all participating players (win/loss message).

#### `PATCH /api/tms/submissions/[id]` · Role: `admin`
Approve or reject a result submission.

#### `POST /api/tms/parse-result` · Role: `admin`
Parse match result from a screenshot using OCR/AI.

#### `POST /api/admin/team/approval` · Role: `admin`
Approve or reject a team application.

---

### Misc Admin

#### `POST /api/admin/discord/test` · Role: `admin`
Send a test message to the Discord internal webhook.

#### `POST /api/admin/telegram/test` · Role: `admin`
Send a test message to the configured Telegram bot.

#### `POST /api/admin/lark/test-sheet` · Role: `admin`
Test writing to the configured Lark spreadsheet.

#### `POST /api/admin/report/trigger` · Role: `admin`
Manually trigger the daily admin report.

#### `POST /api/admin/sql` · Role: `super_admin`
Execute raw SQL. **Extremely restricted.**

---

## Internal / Webhook Endpoints

These are not intended for direct client use.

| Endpoint | Description |
|---|---|
| `POST /api/telegram/webhook` | Telegram bot incoming webhook |
| `POST /api/zalo/webhook` | Zalo OA incoming webhook |
| `POST /api/streams/sync` | Sync live stream status from platform APIs |
| `GET /api/cron/ff-version-check` | Cron: check Free Fire version update |
| `GET /api/cron/daily-report` | Cron: generate and send daily stats report |
| `POST /api/analytics/pageview` | Track a page view (fires from middleware) |
| `GET /api/auth/login-check` | Check login attempt validity |
| `POST /api/auth/register` | Register admin account (invited email only) |
| `POST /api/auth/track-failure` | Log failed login attempt |

---

## Error Responses

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Forbidden (insufficient role/capability) |
| `404` | Not found |
| `422` | Content rejected by filter |
| `429` | Rate limit exceeded |
| `500` | Server error |
| `503` | Service unavailable (Supabase not configured) |

All errors include `{ "error": "message" }`.
