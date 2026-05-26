-- Telegram Mini App subscribers
-- Stores users who opted-in to receive DM notifications from the bot

create table if not exists telegram_subscribers (
  id               uuid        primary key default gen_random_uuid(),
  telegram_user_id bigint      not null,
  first_name       text,
  username         text,
  subscribed_at    timestamptz not null default now(),
  active           boolean     not null default true,
  constraint telegram_subscribers_user_id_unique unique (telegram_user_id)
);

create index if not exists idx_telegram_subscribers_active
  on telegram_subscribers (active)
  where active = true;
