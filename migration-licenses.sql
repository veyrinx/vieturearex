-- ============================================================================
-- Giấy phép bản quyền (license key) cấp cho đối tác dùng sản phẩm Arex
-- Chạy trong Admin → SQL, hoặc Supabase SQL editor. Idempotent.
-- ============================================================================

create table if not exists licenses (
  id               uuid        primary key default gen_random_uuid(),
  -- Mã đầy đủ: AREX-XXXXX-XXXXX-XXXXX-CCCC. Chỉ service role đọc được (RLS
  -- dưới cùng), API quản trị mặc định trả bản che.
  key              text        not null unique,
  partner_name     text        not null,
  contact          text,
  product          text        not null default 'website',
  plan             text        not null default 'standard',
  -- Rỗng = không giới hạn tên miền. Có phần tử = chỉ những tên miền này hợp lệ.
  domains          text[]      not null default '{}',
  features         text[]      not null default '{}',
  max_activations  integer     not null default 1,
  -- active | suspended | revoked. Hết hạn KHÔNG ghi vào đây — suy từ expires_at
  -- lúc đọc, tránh cảnh cột status nói một đằng ngày tháng nói một nẻo.
  status           text        not null default 'active',
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz,
  contract_id      uuid        references partnership_contracts(id) on delete set null,
  note             text,
  created_by       text,
  last_verified_at timestamptz,
  verify_count     integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint licenses_status_check check (status in ('active', 'suspended', 'revoked')),
  constraint licenses_max_activations_check check (max_activations >= 1)
);

create index if not exists idx_licenses_status  on licenses (status);
create index if not exists idx_licenses_partner on licenses (partner_name);
create index if not exists idx_licenses_expires on licenses (expires_at);

-- Mỗi bản cài đặt (site/app) tự sinh một instance_id ổn định rồi gửi kèm lúc
-- xác thực. Nhờ vậy đếm được đang có bao nhiêu chỗ dùng chung một mã.
create table if not exists license_activations (
  id            uuid        primary key default gen_random_uuid(),
  license_id    uuid        not null references licenses(id) on delete cascade,
  instance_id   text        not null,
  domain        text,
  ip            text,
  user_agent    text,
  app_version   text,
  active        boolean     not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  verify_count  integer     not null default 1,
  constraint license_activations_unique unique (license_id, instance_id)
);

create index if not exists idx_license_activations_license on license_activations (license_id);

-- Nhật ký: cấp mã, gia hạn, thu hồi, và cả những lần xác thực TRƯỢT (sai tên
-- miền, quá số máy) — dấu hiệu mã đang bị chia sẻ ra ngoài.
create table if not exists license_events (
  id         uuid        primary key default gen_random_uuid(),
  license_id uuid        references licenses(id) on delete cascade,
  event      text        not null,
  detail     text,
  ip         text,
  actor      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_license_events_license on license_events (license_id, created_at desc);

-- Không policy nào = chỉ service role (API phía server) đụng được. Mã bản quyền
-- không bao giờ được lộ cho anon/authenticated qua PostgREST.
alter table licenses            enable row level security;
alter table license_activations enable row level security;
alter table license_events      enable row level security;
