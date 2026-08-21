// Nội dung giới thiệu trang Hợp tác — quyền lợi từng gói, quy trình, câu hỏi
// thường gặp và ranh giới nội dung Arex không nhận.
//
// Tách khỏi `partners.ts` (danh sách đối tác đã công bố) vì đây là phần "chào
// hàng": trang /partnership đọc để dựng giới thiệu, còn hợp đồng ở
// `partnership-contract.ts` đọc PACKAGE_BENEFITS để ghi thẳng quyền lợi cam kết
// vào Điều 3 — sửa quyền lợi ở đây thì hợp đồng ký sau cũng đổi theo.

import type { PartnerTier } from "@/lib/constants/partners";

/** Quyền lợi Bên A cam kết theo từng gói. Ghi vào hợp đồng nên phải viết đủ ý. */
export const PACKAGE_BENEFITS: Record<PartnerTier, string[]> = {
  sponsor: [
    "Logo Bên B hiển thị tại mục “Nhà tài trợ” trên trang Hợp tác & Đối tác, kèm liên kết về website hoặc fanpage chính thức của Bên B.",
    "Logo Bên B xuất hiện trên ảnh bìa, thể lệ và bảng xếp hạng của các giải đấu cộng đồng do Bên A tổ chức trong thời hạn hợp đồng.",
    "Tối thiểu 02 bài viết giới thiệu hoặc nhắc tên Bên B trên chuyên mục Tin tức của website Bên A trong mỗi 30 ngày hợp tác.",
    "Nhắc tên Bên B trong bài đăng công bố giải đấu trên các kênh mạng xã hội của Bên A (Facebook, TikTok, Zalo, Telegram, Discord).",
    "Báo cáo hiệu quả (lượt xem bài viết, lượt hiển thị logo) gửi qua email khi Bên B yêu cầu, tối đa 01 lần mỗi tháng.",
  ],
  media: [
    "Logo và liên kết của Bên B hiển thị tại mục “Đối tác truyền thông” trên trang Hợp tác & Đối tác.",
    "Hai bên trao đổi bài đăng chéo: mỗi bên đăng tối thiểu 01 nội dung của bên còn lại trong mỗi 30 ngày hợp tác.",
    "Bên B được sử dụng lại tin tức do Bên A sản xuất với điều kiện ghi rõ nguồn “Arex” và dẫn liên kết về bài gốc.",
    "Bên A ưu tiên đưa tin về sự kiện, giải đấu, sản phẩm hợp lệ do Bên B tổ chức hoặc phát hành.",
  ],
  community: [
    "Tên, logo và liên kết cộng đồng của Bên B hiển thị tại mục “Cộng đồng đồng hành” trên trang Hợp tác & Đối tác.",
    "Thành viên cộng đồng Bên B được tham gia các giải đấu, sự kiện, minigame do Bên A tổ chức theo suất dành cho đối tác.",
    "Bên A hỗ trợ đăng thông báo tuyển thành viên hoặc sự kiện của Bên B trên kênh cộng đồng, tối đa 02 lần mỗi tháng.",
    "Hai bên hỗ trợ nhau xác minh và cảnh báo các trường hợp lừa đảo trong cộng đồng Free Fire Việt Nam.",
  ],
};

/** Nghĩa vụ riêng của Bên B theo gói — ghép vào Điều 4 của hợp đồng. */
export const PACKAGE_DUTIES: Record<PartnerTier, string[]> = {
  sponsor: [
    "Cung cấp đúng và đủ khoản tài trợ (tiền, hiện vật hoặc giải thưởng) đã thỏa thuận, đúng tiến độ ghi tại Điều 5.",
    "Cung cấp bộ nhận diện (logo, tên thương hiệu) ở định dạng sử dụng được và cho phép Bên A sử dụng trong phạm vi hợp đồng.",
    "Bảo đảm sản phẩm, dịch vụ được quảng bá là hợp pháp và xuất trình giấy tờ chứng minh khi Bên A yêu cầu.",
  ],
  media: [
    "Bảo đảm nội dung do Bên B sản xuất không xâm phạm quyền tác giả, quyền liên quan của bên thứ ba.",
    "Ghi rõ nguồn và dẫn liên kết về bài gốc khi sử dụng lại nội dung của Bên A.",
    "Không cắt ghép, sửa đổi nội dung của Bên A theo hướng làm sai lệch ý nghĩa gốc.",
  ],
  community: [
    "Quản lý cộng đồng của mình theo đúng pháp luật Việt Nam và quy chế cộng đồng của Bên A khi tham gia hoạt động chung.",
    "Không dùng danh nghĩa hợp tác với Bên A để kêu gọi nạp tiền, mua bán tài khoản hoặc thu lợi trái phép.",
  ],
};

export const PACKAGE_TAGLINE: Record<PartnerTier, string> = {
  sponsor: "Dành cho nhãn hàng, studio, dịch vụ game muốn xuất hiện cùng giải đấu và tin tức của Arex.",
  media: "Dành cho trang tin, kênh YouTube/TikTok, fanpage muốn trao đổi nội dung và nguồn tin hai chiều.",
  community: "Dành cho guild, clan, nhóm cộng đồng Free Fire muốn đồng hành trong sự kiện và hoạt động chung.",
};

export const PACKAGE_FEE_NOTE: Record<PartnerTier, string> = {
  sponsor: "Giá trị tài trợ do hai bên thỏa thuận",
  media: "Không thu phí — trao đổi quyền lợi",
  community: "Không thu phí",
};

/** Năng lực Bên A mang lại — mô tả kênh có thật, không nêu con số chưa kiểm chứng. */
export const AREX_CAPABILITIES: Array<{ title: string; desc: string }> = [
  {
    title: "Website tin tức Free Fire",
    desc: "Chuyên mục tin tức, sự kiện, wiki nhân vật – vũ khí – vật phẩm, cập nhật theo từng bản OB.",
  },
  {
    title: "Cộng đồng đa nền tảng",
    desc: "Nhóm Zalo, Telegram, Discord cùng fanpage Facebook, TikTok và hệ thống thông báo đẩy tới người dùng.",
  },
  {
    title: "Ứng dụng di động",
    desc: "Ứng dụng Arex trên Android, iOS và mini app trên Zalo, Telegram cho người dùng truy cập nhanh.",
  },
  {
    title: "Giải đấu & sự kiện cộng đồng",
    desc: "Giải đấu cộng đồng, minigame, bình chọn nhân vật và các hoạt động tương tác định kỳ.",
  },
  {
    title: "Bộ công cụ cho người chơi",
    desc: "Tra cứu UID, so sánh người chơi, tính K/D, định giá tài khoản, kiểm tra lừa đảo — nơi đặt thương hiệu tự nhiên.",
  },
  {
    title: "Hồ sơ minh bạch",
    desc: "Trang đội ngũ công khai người phụ trách, nhật ký phiên bản và chính sách rõ ràng để đối tác thẩm định.",
  },
];

/** Bốn bước từ lúc điền hợp đồng tới lúc hiển thị công khai. */
export const PARTNERSHIP_PROCESS: Array<{ step: string; title: string; desc: string }> = [
  {
    step: "01",
    title: "Điền & ký trực tuyến",
    desc: "Bên đối tác điền thông tin, chọn gói hợp tác, đọc toàn văn điều khoản rồi ký điện tử ngay trên trình duyệt.",
  },
  {
    step: "02",
    title: "Arex thẩm định",
    desc: "Đội ngũ Arex đối chiếu thông tin và nội dung hợp tác trong tối đa 03 ngày làm việc, có thể liên hệ xác minh.",
  },
  {
    step: "03",
    title: "Arex ký & hợp đồng có hiệu lực",
    desc: "Người đại diện Arex ký điện tử. Hợp đồng chuyển sang trạng thái “Đã ký”, hai bên giữ bản điện tử giống nhau.",
  },
  {
    step: "04",
    title: "Triển khai & hiển thị",
    desc: "Logo, liên kết của đối tác lên trang Hợp tác & Đối tác; các quyền lợi còn lại triển khai theo Điều 3 hợp đồng.",
  },
];

/** Ranh giới — nói trước để khỏi mất thời gian của cả hai bên. */
export const NOT_ACCEPTED: string[] = [
  "Cờ bạc, cá độ, game bài đổi thưởng, vòng quay ăn tiền dưới mọi hình thức.",
  "Dịch vụ hack, cheat, mod, tự động hóa hoặc can thiệp trái phép vào Free Fire.",
  "Mua bán tài khoản, nạp kim cương qua cổng không chính thức, dịch vụ vi phạm điều khoản của Garena.",
  "Nội dung sai sự thật, bôi nhọ cá nhân hoặc tổ chức, kích động thù hằn, vi phạm thuần phong mỹ tục.",
  "Vay tiền nhanh, tiền ảo, đa cấp và các sản phẩm tài chính chưa được cấp phép tại Việt Nam.",
  "Rượu bia, thuốc lá, vũ khí và hàng hóa cấm quảng cáo theo Điều 7 Luật Quảng cáo 2012.",
];

export const PARTNERSHIP_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Ký điện tử trên website có giá trị pháp lý không?",
    a: "Có. Luật Giao dịch điện tử 2023 (20/2023/QH15) công nhận thông điệp dữ liệu có giá trị như văn bản, và chữ ký điện tử có giá trị như chữ ký tay khi xác định được người ký cùng sự chấp thuận của họ. Hệ thống lưu lại toàn văn điều khoản tại thời điểm ký, mã kiểm tra toàn vẹn SHA-256, hình ảnh chữ ký, thời gian, địa chỉ IP và thiết bị ký của cả hai bên.",
  },
  {
    q: "Chưa đủ 18 tuổi có ký được không?",
    a: "Được, nhưng phải có người đại diện theo pháp luật (cha, mẹ hoặc người giám hộ) đồng ý và điền thông tin trong biểu mẫu, theo Điều 21 Bộ luật Dân sự 2015. Hệ thống tự hiện phần này khi ngày sinh bạn nhập cho thấy chưa đủ 18 tuổi.",
  },
  {
    q: "Tôi là cá nhân, không có công ty thì hợp tác được không?",
    a: "Được. Chọn “Cá nhân” ở phần thông tin Bên B và điền số CCCD hoặc hộ chiếu. Nếu là doanh nghiệp, hộ kinh doanh hay tổ chức thì chọn “Tổ chức” và điền thêm mã số thuế, số đăng ký kinh doanh cùng chức vụ người đại diện.",
  },
  {
    q: "Hợp tác có mất phí không?",
    a: "Gói Cộng đồng đồng hành và Đối tác truyền thông không thu phí — hai bên trao đổi quyền lợi cho nhau. Gói Nhà tài trợ có giá trị tài trợ do hai bên thỏa thuận và ghi rõ tại Điều 5 hợp đồng.",
  },
  {
    q: "Arex có xuất hóa đơn hay khấu trừ thuế không?",
    a: "Với khoản chi trả cho tổ chức, Bên B xuất hóa đơn theo quy định. Với cá nhân không ký hợp đồng lao động, khoản chi từ 2.000.000 đồng trở lên mỗi lần bị khấu trừ 10% thuế thu nhập cá nhân theo Thông tư 111/2013/TT-BTC, trừ trường hợp có cam kết thu nhập chưa đến mức chịu thuế theo quy định.",
  },
  {
    q: "Muốn dừng hợp tác giữa chừng thì sao?",
    a: "Mỗi bên được đơn phương chấm dứt bằng thông báo trước tối thiểu 15 ngày, theo Điều 10 hợp đồng. Khi chấm dứt, Arex gỡ logo và các nội dung liên quan khỏi website trong 05 ngày làm việc.",
  },
  {
    q: "Dữ liệu cá nhân tôi điền được dùng vào việc gì?",
    a: "Chỉ dùng để giao kết, thực hiện hợp đồng và liên hệ với bạn. Arex không bán, không chuyển cho bên thứ ba ngoài trường hợp pháp luật yêu cầu, theo Nghị định 13/2023/NĐ-CP. Bạn có quyền yêu cầu xem, sửa hoặc xóa dữ liệu qua email liên hệ trên trang.",
  },
];
