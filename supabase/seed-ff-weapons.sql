-- ============================================================
-- Arex — Nạp dữ liệu vũ khí Free Fire (ff_weapons + ff_loadouts)
--
-- Bảng ff_weapons đang RỖNG nên toàn bộ mảng /weapons (danh sách, chi tiết,
-- so sánh, combo, lọc theo thể loại) chỉ hiện "Chưa có vũ khí nào được cập
-- nhật". File này nạp bộ vũ khí nền của game để mảng đó sống lại.
--
-- Quy ước chỉ số — GIỮ ĐÚNG khi thêm khẩu mới, nếu không thanh chỉ số ở trang
-- chi tiết (chuẩn hoá theo giá trị lớn nhất toàn bảng) sẽ lệch:
--   damage / range / rate_of_fire / reload : thang 0-100 như bảng chỉ số trong
--     game (reload = TỐC ĐỘ thay đạn, càng cao càng nhanh).
--   magazine : số viên thật của băng đạn gốc, không phải thang 0-100.
--
-- Số liệu lấy theo bảng chỉ số cộng đồng, dùng để so sánh tương đối giữa các
-- khẩu. Mỗi lần Garena cân bằng lại thì sửa qua /admin/weapons chứ đừng sửa
-- file này.
--
-- image_url để chuỗi rỗng (cột NOT NULL): kho icon chính chủ không có ảnh súng
-- nền, trang tự rơi về khung dự phòng theo thể loại. Có ảnh thật thì tải lên
-- trong /admin/weapons.
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại (khớp theo slug).
-- ============================================================

INSERT INTO public.ff_weapons
  (slug, name, weapon_type, description, damage, range, rate_of_fire, reload, magazine, attachments, image_url)
VALUES
  -- ── Súng trường (AR) ──────────────────────────────────────
  ('ak47', 'AK47', 'ar',
   'Sát thương mỗi viên cao nhất nhóm AR, đổi lại độ giật lớn — hợp bắn tỉa điểm và giao tranh tầm trung.',
   61, 73, 56, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng","note":"Giảm giật, giữ tâm khi bắn liên thanh"},{"slot":"foregrip","name":"Ốp lót tay","note":"Ghì tâm theo chiều dọc"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('scar', 'SCAR', 'ar',
   'AR cân bằng nhất: giật thấp, dễ ghì tâm, phù hợp mọi cự ly.',
   55, 71, 61, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"scope","name":"Ống ngắm 2x"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('m4a1', 'M4A1', 'ar',
   'AR dễ dùng, độ giật thấp và nhận đủ phụ kiện — lựa chọn an toàn cho người mới.',
   53, 71, 61, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"foregrip","name":"Ốp lót tay"},{"slot":"stock","name":"Báng súng"}]'::jsonb, ''),
  ('groza', 'Groza', 'ar',
   'AR trong thùng đồ tiếp tế: sát thương và tầm bắn đều cao, không cần phụ kiện.',
   61, 73, 59, 41, 30, '[]'::jsonb, ''),
  ('aug', 'AUG', 'ar',
   'AR kèm ống ngắm sẵn, ổn định khi ngắm bắn ở tầm trung–xa.',
   54, 72, 62, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('xm8', 'XM8', 'ar',
   'Tầm bắn xa nhất nhóm AR, đạn đi thẳng — mạnh khi ghìm địch ở khoảng cách lớn.',
   51, 78, 61, 41, 30,
   '[{"slot":"scope","name":"Ống ngắm 4x"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('famas', 'FAMAS', 'ar',
   'Bắn theo loạt 3 viên, hạ gục nhanh ở tầm trung nếu đủ chính xác.',
   58, 71, 56, 41, 25,
   '[{"slot":"scope","name":"Ống ngắm 2x"},{"slot":"stock","name":"Báng súng"}]'::jsonb, ''),
  ('parafal', 'Parafal', 'ar',
   'Sát thương cao, nhịp bắn chậm hơn — thiên về bắn điểm hơn là xả băng.',
   60, 74, 51, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"foregrip","name":"Ốp lót tay"}]'::jsonb, ''),
  ('an94', 'AN94', 'ar',
   'Càng bắn lâu nhịp bắn càng nhanh, thưởng cho người ghì được tâm.',
   62, 73, 54, 41, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('woodpecker', 'Woodpecker', 'ar',
   'Xuyên giáp tốt, bắn từng viên ở tầm xa — gần với súng bán tự động hơn là AR.',
   65, 76, 45, 40, 20,
   '[{"slot":"scope","name":"Ống ngắm 4x"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),

  -- ── Tiểu liên (SMG) ───────────────────────────────────────
  ('mp40', 'MP40', 'smg',
   'Nhịp bắn cao nhất nhóm SMG, hạ gục cực nhanh trong nhà nhưng hết đạn rất sớm.',
   48, 33, 83, 30, 20,
   '[{"slot":"magazine","name":"Băng đạn mở rộng","note":"Bắt buộc — băng gốc quá ngắn"},{"slot":"muzzle","name":"Đầu nòng"}]'::jsonb, ''),
  ('ump', 'UMP', 'smg',
   'SMG xuyên giáp, giữ được sát thương ở cự ly xa hơn phần còn lại của nhóm.',
   50, 45, 63, 32, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"foregrip","name":"Ốp lót tay"}]'::jsonb, ''),
  ('mp5', 'MP5', 'smg',
   'SMG cân bằng, nhận đủ phụ kiện và dễ điều khiển.',
   48, 40, 72, 33, 30,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"scope","name":"Ống ngắm 2x"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('thompson', 'Thompson', 'smg',
   'Băng 40 viên, xả dài mà không phải nạp — hợp đánh trong nhà nhiều địch.',
   48, 38, 69, 30, 40,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"foregrip","name":"Ốp lót tay"}]'::jsonb, ''),
  ('vector', 'Vector', 'smg',
   'Cầm được hai khẩu cùng lúc, tốc độ bắn rất cao ở cự ly gần.',
   44, 35, 82, 34, 22, '[]'::jsonb, ''),
  ('bizon', 'Bizon', 'smg',
   'Băng 53 viên và nạp nhanh, giữ áp lực liên tục.',
   45, 42, 71, 26, 53,
   '[{"slot":"muzzle","name":"Đầu nòng"},{"slot":"scope","name":"Ống ngắm 2x"}]'::jsonb, ''),
  ('cg15', 'CG15', 'smg',
   'SMG bắn đạn năng lượng, không cần nạp mà tự hồi đạn.',
   47, 44, 70, 33, 30, '[]'::jsonb, ''),

  -- ── Bắn tỉa (Sniper) ──────────────────────────────────────
  ('awm', 'AWM', 'sniper',
   'Khẩu bắn tỉa mạnh nhất, một phát hạ mũ cấp 3 — chỉ có trong thùng tiếp tế.',
   90, 91, 22, 25, 5, '[]'::jsonb, ''),
  ('kar98k', 'Kar98k', 'sniper',
   'Bắn tỉa cơ bản, một phát hạ mũ cấp 2 nếu trúng đầu.',
   90, 85, 26, 30, 5,
   '[{"slot":"scope","name":"Ống ngắm 8x"},{"slot":"muzzle","name":"Đầu nòng"}]'::jsonb, ''),
  ('m82b', 'M82B', 'sniper',
   'Bắn tỉa xuyên gloo wall và xe, ép địch không núp được.',
   88, 88, 30, 27, 8, '[]'::jsonb, ''),

  -- ── Bán tự động (DMR) ─────────────────────────────────────
  ('sks', 'SKS', 'marksman',
   'Bán tự động tầm xa, bắn nhanh hơn bắn tỉa mà vẫn đủ sát thương.',
   72, 82, 44, 36, 10,
   '[{"slot":"scope","name":"Ống ngắm 4x"},{"slot":"muzzle","name":"Đầu nòng"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),
  ('svd', 'SVD', 'marksman',
   'DMR sát thương cao nhất nhóm, lấy trong thùng tiếp tế.',
   79, 84, 41, 33, 10, '[]'::jsonb, ''),
  ('m14', 'M14', 'marksman',
   'Băng 20 viên, ghìm địch ở tầm xa mà không phải nạp liên tục.',
   72, 81, 45, 36, 20,
   '[{"slot":"scope","name":"Ống ngắm 4x"},{"slot":"magazine","name":"Băng đạn mở rộng"}]'::jsonb, ''),

  -- ── Shotgun ───────────────────────────────────────────────
  ('m1014', 'M1014', 'shotgun',
   'Shotgun bán tự động, bắn liền nhiều phát khi áp sát.',
   94, 22, 41, 25, 5, '[]'::jsonb, ''),
  ('spas12', 'SPAS12', 'shotgun',
   'Shotgun sát thương cao, chùm đạn tụm hơn nên ăn được ở cự ly hơi xa.',
   96, 24, 38, 22, 6, '[]'::jsonb, ''),
  ('m1887', 'M1887', 'shotgun',
   'Hai viên, mỗi viên gần như hạ gục ngay — sai một phát là trả giá.',
   100, 26, 30, 20, 2, '[]'::jsonb, ''),
  ('mag7', 'MAG-7', 'shotgun',
   'Shotgun nhịp bắn nhanh, xử lý nhiều mục tiêu trong nhà.',
   88, 20, 47, 28, 5, '[]'::jsonb, ''),

  -- ── Trung liên (LMG) ──────────────────────────────────────
  ('m249', 'M249', 'lmg',
   'Băng 100 viên, ghìm đầu địch và phá gloo wall rất nhanh.',
   50, 65, 74, 20, 100, '[]'::jsonb, ''),
  ('gatling', 'Gatling', 'lmg',
   'Vũ khí tiếp tế, xả 200 viên liên tục nhưng làm chậm người cầm.',
   55, 62, 90, 15, 200, '[]'::jsonb, ''),

  -- ── Súng lục ──────────────────────────────────────────────
  ('desert-eagle', 'Desert Eagle', 'pistol',
   'Súng lục sát thương cao nhất, dùng được như súng phụ tầm trung.',
   84, 63, 32, 40, 7, '[]'::jsonb, ''),
  ('m500', 'M500', 'pistol',
   'Ổ quay sát thương rất cao, thưởng cho phát bắn chính xác.',
   90, 60, 28, 25, 6, '[]'::jsonb, ''),
  ('usp', 'USP', 'pistol',
   'Súng lục có giảm thanh, mở màn không lộ vị trí.',
   46, 50, 56, 45, 15, '[]'::jsonb, ''),
  ('g18', 'G18', 'pistol',
   'Súng lục liên thanh, cứu cánh khi đầu trận chưa nhặt được súng chính.',
   40, 41, 78, 44, 20, '[]'::jsonb, ''),
  ('treatment-gun', 'Treatment Gun', 'pistol',
   'Không gây sát thương — bắn để hồi máu cho đồng đội từ xa.',
   0, 30, 40, 40, 3, '[]'::jsonb, ''),

  -- ── Súng phóng ────────────────────────────────────────────
  ('m79', 'M79', 'launcher',
   'Phóng lựu, dọn địch núp sau gloo wall hoặc trong nhà.',
   100, 55, 20, 18, 1, '[]'::jsonb, ''),

  -- ── Cận chiến ─────────────────────────────────────────────
  ('katana', 'Katana', 'melee',
   'Vũ khí cận chiến sát thương cao nhất, tầm đánh dài hơn phần còn lại.',
   78, 12, 45, NULL, NULL, '[]'::jsonb, ''),
  ('machete', 'Machete', 'melee',
   'Dao rựa, đánh nhanh và ổn định khi chưa nhặt được súng.',
   70, 11, 50, NULL, NULL, '[]'::jsonb, ''),
  ('pan', 'Pan', 'melee',
   'Chảo — vừa đánh vừa che được đạn sau lưng khi đeo.',
   60, 10, 40, NULL, NULL, '[]'::jsonb, ''),

  -- ── Vật ném ───────────────────────────────────────────────
  ('gloo-wall', 'Gloo Wall', 'throwable',
   'Tường băng dựng tức thì — công cụ sống còn khi hồi máu, cứu đồng đội hay chiếm nhà.',
   NULL, 25, NULL, NULL, 2, '[]'::jsonb, ''),
  ('grenade', 'Lựu đạn', 'throwable',
   'Sát thương nổ trong phạm vi rộng, đẩy địch ra khỏi chỗ núp.',
   85, 30, NULL, NULL, 1, '[]'::jsonb, ''),
  ('flashbang', 'Flashbang', 'throwable',
   'Làm loá mắt địch trong vài giây, mở đường xông vào nhà.',
   NULL, 28, NULL, NULL, 1, '[]'::jsonb, ''),
  ('smoke-grenade', 'Bom khói', 'throwable',
   'Che tầm nhìn để cứu đồng đội hoặc băng qua bãi trống.',
   NULL, 26, NULL, NULL, 1, '[]'::jsonb, '')
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  weapon_type  = EXCLUDED.weapon_type,
  description  = EXCLUDED.description,
  damage       = EXCLUDED.damage,
  range        = EXCLUDED.range,
  rate_of_fire = EXCLUDED.rate_of_fire,
  reload       = EXCLUDED.reload,
  magazine     = EXCLUDED.magazine,
  attachments  = EXCLUDED.attachments,
  updated_at   = now();

-- ── Combo vũ khí ────────────────────────────────────────────
-- Mỗi combo trỏ tới hai khẩu bằng slug, tra id ngay lúc chạy để không phải
-- chép tay uuid.
INSERT INTO public.ff_loadouts (slug, name, description, playstyle, primary_weapon_id, secondary_weapon_id, position)
SELECT c.slug, c.name, c.description, c.playstyle, p.id, s.id, c.position
FROM (VALUES
  ('mp40-m1887',   'MP40 + M1887',        'Combo áp sát kinh điển: M1887 mở màn một phát, MP40 dọn nốt nếu hụt.', 'rush',      'mp40',   'm1887',  1),
  ('ak47-mp40',    'AK47 + MP40',         'Một khẩu cho tầm trung, một khẩu cho lúc bị dí sát — cân được cả hai pha.', 'balanced', 'ak47',   'mp40',   2),
  ('m1014-ump',    'M1014 + UMP',         'Shotgun bán tự động ghép SMG xuyên giáp, đánh nhà rất lì.',            'rush',      'm1014',  'ump',    3),
  ('awm-mp40',     'AWM + MP40',          'Bắn tỉa hạ mũ cấp 3 từ xa, MP40 lo phần tự vệ khi bị áp sát.',         'sniper',    'awm',    'mp40',   4),
  ('kar98k-m4a1',  'Kar98k + M4A1',       'Combo bắn tỉa dễ chơi: rỉa từ xa rồi đổi AR khi địch tiến vào.',       'sniper',    'kar98k', 'm4a1',   5),
  ('xm8-sks',      'XM8 + SKS',           'Đè đầu địch ở tầm xa trên bãi trống, không cho tiến lên.',             'defensive', 'xm8',    'sks',    6),
  ('m249-m1887',   'M249 + M1887',        'M249 phá gloo wall rồi M1887 kết liễu — combo phá thủ.',               'rush',      'm249',   'm1887',  7),
  ('scar-m1014',   'SCAR + M1014',        'Bộ đôi an toàn cho người mới: SCAR dễ ghì tâm, M1014 cho pha cận.',    'balanced',  'scar',   'm1014',  8)
) AS c(slug, name, description, playstyle, primary_slug, secondary_slug, position)
JOIN public.ff_weapons p ON p.slug = c.primary_slug
JOIN public.ff_weapons s ON s.slug = c.secondary_slug
ON CONFLICT (slug) DO UPDATE SET
  name                = EXCLUDED.name,
  description         = EXCLUDED.description,
  playstyle           = EXCLUDED.playstyle,
  primary_weapon_id   = EXCLUDED.primary_weapon_id,
  secondary_weapon_id = EXCLUDED.secondary_weapon_id,
  position            = EXCLUDED.position,
  updated_at          = now();
