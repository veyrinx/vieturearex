-- Character roster (admin-managed)
CREATE TABLE IF NOT EXISTS character_votes_config (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  image_url   TEXT,
  ability     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  sort_order  INT     NOT NULL DEFAULT 0,
  season      TEXT    NOT NULL DEFAULT 'S1',
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Vote log — one vote per user per season
CREATE TABLE IF NOT EXISTS character_vote_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID        NOT NULL REFERENCES character_votes_config(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season       TEXT        NOT NULL DEFAULT 'S1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season)
);

CREATE INDEX IF NOT EXISTS char_vote_char_idx ON character_vote_logs (character_id);
CREATE INDEX IF NOT EXISTS char_vote_season_idx ON character_vote_logs (season);

ALTER TABLE character_votes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_vote_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads characters"
  ON character_votes_config FOR SELECT USING (is_active = true);

CREATE POLICY "admins manage characters"
  ON character_votes_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager')));

CREATE POLICY "anyone reads vote logs"
  ON character_vote_logs FOR SELECT USING (true);

CREATE POLICY "users vote"
  ON character_vote_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users change vote"
  ON character_vote_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Seed popular Free Fire characters (Season 1)
INSERT INTO character_votes_config (name, ability, description, sort_order, season) VALUES
  ('Alok',    'Drop the Beat',        'Tạo vùng aura tăng tốc độ di chuyển và hồi máu liên tục trong vài giây.', 1,  'S1'),
  ('Chrono',  'Time Turner',          'Tạo khiên lực trường ngăn chặn sát thương, tăng tốc độ đồng đội bên trong.', 2,  'S1'),
  ('K',       'Master of All',        'Có hai chế độ: tăng tối đa EP và chuyển đổi EP thành HP liên tục.', 3,  'S1'),
  ('Skyler',  'Riptide Rhythm',       'Phát sóng âm thanh phá hủy Gloo Wall, mỗi Gloo Wall triển khai hồi HP.', 4,  'S1'),
  ('Dimitri', 'Healing Heartbeat',    'Tạo vùng hồi sinh, bản thân và đồng đội trong vùng có thể tự hồi phục khi bị hạ gục.', 5,  'S1'),
  ('Moco',    'Hacker''s Eye',        'Đánh dấu kẻ địch bị bắn, thông tin vị trí chia sẻ cho toàn đội trong vài giây.', 6,  'S1'),
  ('Wukong',  'Camouflage',           'Hóa thân thành bụi cây, kỹ năng hồi chiêu khi tiêu diệt kẻ địch.', 7,  'S1'),
  ('Kapella', 'Healing Song',         'Tăng hiệu ứng kỹ năng hồi phục, giảm tốc độ mất HP khi bị hạ gục.', 8,  'S1'),
  ('Xayne',   'Xtreme Encounter',     'Tăng 80 HP tạm thời và sát thương lên Gloo Wall, Shield trong thời gian ngắn.', 9,  'S1'),
  ('Shirou',  'Damage Delivered',     'Đánh dấu kẻ địch bắn vào mình, đòn bắn đầu tiên xuyên giáp trong thời gian ngắn.', 10, 'S1'),
  ('Jai',     'Raging Reload',        'Tự động nạp đạn một phần khi tiêu diệt kẻ địch với AR, SMG hoặc Shotgun.', 11, 'S1'),
  ('Nairi',   'Ice Iron',             'Gloo Wall đặt xuống hồi phục nhanh hơn và có giáp tăng cường chống đạn.', 12, 'S1')
ON CONFLICT (name) DO NOTHING;
