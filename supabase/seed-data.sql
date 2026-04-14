-- ============================================================
-- AREX – SEED INITIAL DATA
-- ============================================================
-- Chạy file này SAU khi đã run schema.sql
-- Location: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- SEED EVENTS
-- ============================================================
-- No test events seeded. Add real events via admin panel.
-- insert into public.events (title, description, start_date, end_date, image_url, thumbnail_url, link, status)
-- values
--   (
--     'Free Fire Battle Royale Championship 2024',
--     'Giải đấu Battle Royale lớn nhất Việt Nam với tổng tiền thưởng 1 tỷ đồng. Các đội hàng đầu sẽ tranh tài trong 15 trận đấu để tìm ra nhà vô địch.',
--     '2024-04-15'::timestamptz,
--     '2024-04-30'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://battleground.freefiremobile.com',
--     'upcoming'
--   ),
--   (
--     'CS Xạ Thủ Championship Spring',
--     'Giải đấu CS (Clue Story) dành riêng cho những xạ thủ xuất sắc nhất. Hạn chế vũ khí, chỉ dùng các vũ khí từ trong game.',
--     '2024-05-01'::timestamptz,
--     '2024-05-15'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://communityevent.freefiremobile.com',
--     'active'
--   ),
--   (
--     'Clash Squad Tournament',
--     'Giải đấu 4v4 Clash Squad nhanh gọn, từng trận chỉ kéo dài 10 phút. Phù hợp cho các team muốn luyện tập kỹ năng.',
--     '2024-06-01'::timestamptz,
--     '2024-06-20'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     null,
--     'upcoming'
--   ),
--   (
--     'Community Fun Event',
--     'Sự kiện vui nhộn dành cho toàn bộ cộng đồng. Các phần thưởng hấp dẫn chờ đã các bạn.',
--     '2024-03-15'::timestamptz,
--     '2024-03-31'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     null,
--     'active'
--   );

-- ============================================================
-- SEED NEWS
-- ============================================================
-- No test news seeded. Add real news via admin panel.
-- insert into public.news (title, slug, excerpt, content, cover, category, status)
-- values
--   (
--     'Update Mới: 5 Vũ Khí Siêu Mạnh Xuất Hiện',
--     'update-vu-khi-sieu-manh',
--     'Garena Free Fire vừa phát hành bản update lớn với 5 vũ khí hoàn toàn mới, mang lại sự thay đổi lớn trong meta game.',
--     '# Bản Update Mới: Vũ Khí Siêu Mạnh
--
-- Garena Free Fire vừa phát hành bản update 5.0 với những thay đổi lớn.
--
-- ## 5 Vũ Khí Mới:
--
-- 1. **Plasma AR** - Súng trường tấn công với công suất sát thương cao
-- 2. **Bolt Sniper** - Súng狙 với tầm bắn siêu xa
-- 3. **Lightning SMG** - Súng tiểu liên tốc độ cao
-- 4. **Firestorm Shotgun** - Shotgun gây sát thương diện rộng
-- 5. **Void Pistol** - Súng lục với hiệu ứng đặc biệt
--
-- ## Thay Đổi Cân Bằng:
--
-- - Các vũ khí cũ được điều chỉnh lại
-- - Map được cải thiện đồ họa
-- - Hệ thống loot được tối ưu hóa
--
-- **Update sẽ có hiệu lực từ ngày 15/03/2024**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'PATCH NOTE',
--     'published'
--   ),
--   (
--     'Top 10 Pro Player Việt Nam 2024',
--     'top-10-pro-player-viet-nam-2024',
--     'Danh sách những game thủ Free Fire xuất sắc nhất Việt Nam hiện nay với kỹ năng và thành tích đáng nể.',
--     '# Top 10 Pro Player Việt Nam 2024
--
-- Những tên tuổi huyền thoại của cộng đồng Free Fire Việt Nam:
--
-- ## 1. **Góc Tối**
-- - Team: Elite Team
-- - Thành tích: 5 lần vô địch
-- - Kỹ năng: Xạ thủ, chiến thuật
--
-- ## 2. **Sky Player**
-- - Team: Phoenix eSports
-- - Thành tích: 3 lần vô địch
-- - Kỹ năng: AWM, CQB
--
-- ## 3. **King Vane**
-- - Team: Saigon Buffalo
-- - Thành tích: 2 lần vô địch
-- - Kỹ năng: IGL, chiến lược
--
-- Còn 7 người nữa... Bạn có biết họ là ai?
--
-- **Bạn muốn thêm vào top của bạn không? Hãy tham gia giải đấu sắp tới!**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'ESPORTS',
--     'published'
--   ),
--   (
--     'Hướng Dẫn Chơi Map Bermuda Mới',
--     'huong-dan-choi-map-bermuda-moi',
--     'Tìm hiểu những thay đổi mới trên map Bermuda và các chiến lược để thắng lớn.',
--     '# Hướng Dẫn Chơi Map Bermuda Cập Nhật
--
-- Map Bermuda đã được cải thiện đồ họa và bổ sung các khu vực mới.
--
-- ## Những Thay Đổi Chính:
--
-- - **Khu vực bãi biển:** Thêm các công trình phòng thủ mới
-- - **Thung lũng:** Được mở rộng, có thêm loot
-- - **Thành phố:** Được thiết kế lại, dễ chuyển động hơn
--
-- ## Chiến Lược Chơi:
--
-- 1. **Drop đúng khu vực:** Tránh khu vực có quá nhiều người
-- 2. **Loot nhanh:** Vào nhà sớm, loot chuẩn bị
-- 3. **Giữ đội hình:** Không đi một mình
-- 4. **Quản lý zone:** Dự đoán zone tiếp theo
--
-- **Với những chiến lược này, tỷ lệ thắng của bạn sẽ tăng 50%!**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'CỘng ĐỘI',
--     'published'
--   ),
--   (
--     'Ngôi Sao Mới: Nhân Vật Iris Ra Mắt',
--     'nhan-vat-iris-ra-mat',
--     'Nhân vật mới Iris (bạn gái của Kelly) chính thức ra mắt với kỹ năng độc đáo.',
--     '# Nhân Vật Mới: Iris
--
-- Cuối cùng, người bạn gái của Kelly cuối cùng cũng xuất hiện!
--
-- ## Thông Tin Iris:

- **Tên đầy đủ:** Iris
- **Kỹ năng:** Tạo ra một bong bóng bảo vệ
- **Ưu điểm:** Tốt cho chơi phòng thủ
- **Nhược điểm:** Bong bóng dễ vỡ

## Cách Sử Dụng:

Iris rất hữu ích cho:
- Chơi trong nhà
- Chống AWM sniper
- Bảo vệ đồng đội

**Bạn có thích Iris không? Hãy unlock cô ấy ngay!**',
    'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
    'CỘNG ĐỒNG',
    'published'
  );

-- ============================================================
-- SEED GALLERY
-- ============================================================
insert into public.gallery (image_url, tag)
values
  ('https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg', 'Battle Royale'),
  ('https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg', 'Tournament'),
  ('https://images.unsplash.com/photo-1538481143235-b311b6c4e17b?w=800', 'Gaming'),
  ('https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800', 'Team Play'),
  ('https://images.unsplash.com/photo-1614613535308-eb5fbd219f90?w=800', 'Esports'),
  ('https://images.unsplash.com/photo-1516968124164-a52b6c07b936?w=800', 'Gaming Gear'),
  ('https://images.unsplash.com/photo-1460925895917-aeb19be489c7?w=800', 'Victory'),
  ('https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800', 'Community');

-- ============================================================
-- VERIFY SEED DATA
-- ============================================================
-- Run these queries to verify data was inserted correctly:
--
-- SELECT COUNT(*) as total_events FROM public.events;
-- → Expected: 4
--
-- SELECT COUNT(*) as total_news FROM public.news;
-- → Expected: 4
--
-- SELECT COUNT(*) as total_gallery FROM public.gallery;
-- → Expected: 8
--
-- SELECT * FROM public.settings LIMIT 5;
-- → Expected: 13 rows from schema.sql
--

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- ✅ Seed data inserted successfully!
-- 
-- Next steps:
-- 1. Create admin account (admin@arex.tech)
-- 2. Test login at /admin
-- 3. Verify dashboard shows this data
-- 4. Deploy to Vercel when ready
