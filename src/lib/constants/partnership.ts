// Nội dung TRANG /partnership — phần "chào hàng", chỉ để đọc và hiển thị.
//
// Trang Hợp tác không thu thập gì, không có biểu mẫu: nó giới thiệu Arex làm
// được gì, ba hình thức hợp tác, ranh giới nội dung và đối tác đang đồng hành.
// Mọi việc ký kết nằm ở /partnership/hop-dong.
//
// Quyền lợi / nghĩa vụ dưới đây được hợp đồng đọc lại và ghi THẲNG vào điều
// khoản (xem `partnership-contract.ts`) — sửa ở đây thì hợp đồng ký sau đổi
// theo, hợp đồng đã ký giữ bản chụp riêng nên không bị ảnh hưởng.

import type { PartnerTier } from "@/lib/constants/partners";

// ── Đội / cộng đồng hợp tác: quyền lợi theo gói ──────────────────────────────

/** Quyền lợi Bên A cam kết theo từng gói. Ghi vào hợp đồng nên phải viết đủ ý. */
export const PACKAGE_BENEFITS: Record<PartnerTier, string[]> = {
  sponsor: [
    "Tên và logo Bên B hiển thị tại mục “Nhà tài trợ” trên trang Hợp tác & Đối tác, kèm liên kết về kênh chính thức của Bên B.",
    "Tên và logo Bên B xuất hiện trên ảnh bìa, thể lệ và bảng xếp hạng của các giải đấu, sự kiện cộng đồng do Bên A tổ chức trong thời hạn hợp tác.",
    "Tối thiểu 02 bài viết giới thiệu hoặc nhắc tên Bên B trên chuyên mục Tin tức của Bên A trong mỗi 30 ngày hợp tác.",
    "Nhắc tên Bên B trong bài đăng công bố giải đấu trên các kênh cộng đồng của Bên A (Facebook, TikTok, Zalo, Telegram, Discord).",
    "Báo cáo hiệu quả (lượt xem bài viết, lượt hiển thị) gửi qua email khi Bên B yêu cầu, tối đa 01 lần mỗi tháng.",
  ],
  media: [
    "Tên, logo và liên kết của Bên B hiển thị tại mục “Đối tác truyền thông” trên trang Hợp tác & Đối tác.",
    "Hai bên trao đổi bài đăng chéo: mỗi bên đăng tối thiểu 01 nội dung của bên còn lại trong mỗi 30 ngày hợp tác.",
    "Bên B được đăng lại tin tức do Bên A sản xuất với điều kiện ghi rõ nguồn “Arex” và dẫn liên kết về bài gốc.",
    "Bên A ưu tiên đưa tin về sự kiện, giải đấu, sản phẩm hợp lệ do Bên B tổ chức hoặc phát hành.",
  ],
  community: [
    "Tên, logo và liên kết cộng đồng của Bên B hiển thị tại mục “Cộng đồng đồng hành” trên trang Hợp tác & Đối tác.",
    "Thành viên của Bên B được tham gia giải đấu, sự kiện, minigame do Bên A tổ chức theo suất dành cho đội đối tác.",
    "Bên A hỗ trợ đăng thông báo tuyển thành viên hoặc sự kiện của Bên B trên kênh cộng đồng, tối đa 02 lần mỗi tháng.",
    "Hai bên hỗ trợ nhau xác minh và cảnh báo các trường hợp lừa đảo trong cộng đồng Free Fire Việt Nam.",
  ],
};

/** Nghĩa vụ riêng của đội đối tác theo gói — ghép vào điều khoản nghĩa vụ Bên B. */
export const PACKAGE_DUTIES: Record<PartnerTier, string[]> = {
  sponsor: [
    "Chuyển đủ và đúng hạn khoản tài trợ (tiền, hiện vật hoặc giải thưởng) đã thỏa thuận.",
    "Cung cấp bộ nhận diện (logo, tên, màu thương hiệu) ở định dạng dùng được và cho phép Bên A sử dụng trong phạm vi hợp đồng.",
    "Bảo đảm sản phẩm, dịch vụ được nhắc tới là hợp pháp và giải trình khi Bên A yêu cầu.",
  ],
  media: [
    "Bảo đảm nội dung do Bên B sản xuất không xâm phạm quyền tác giả, quyền liên quan của bên thứ ba.",
    "Ghi rõ nguồn và dẫn liên kết về bài gốc khi đăng lại nội dung của Bên A.",
    "Không cắt ghép, sửa đổi nội dung của Bên A theo hướng làm sai lệch ý nghĩa gốc.",
  ],
  community: [
    "Quản lý cộng đồng của mình theo pháp luật Việt Nam và quy chế hoạt động chung khi tham gia sự kiện của Bên A.",
    "Không dùng danh nghĩa hợp tác với Bên A để kêu gọi nạp tiền, mua bán tài khoản hoặc thu lợi trái phép.",
  ],
};

export const PACKAGE_TAGLINE: Record<PartnerTier, string> = {
  sponsor: "Dành cho đội, nhóm, kênh hoặc cá nhân muốn tài trợ giải đấu và xuất hiện cùng hoạt động của Arex.",
  media: "Dành cho trang tin, kênh YouTube/TikTok, fanpage muốn trao đổi nội dung và nguồn tin hai chiều.",
  community: "Dành cho guild, clan, nhóm cộng đồng Free Fire muốn đồng hành trong sự kiện và hoạt động chung.",
};

export const PACKAGE_FEE_NOTE: Record<PartnerTier, string> = {
  sponsor: "Giá trị tài trợ do hai bên thỏa thuận",
  media: "Không thu phí — trao đổi quyền lợi",
  community: "Không thu phí",
};

// ── Thành viên tham gia đội ngũ Arex ─────────────────────────────────────────

/** Quyền lợi Arex cam kết với thành viên — ghi vào điều khoản quyền lợi Bên B. */
export const MEMBER_BENEFITS: string[] = [
  "Được ghi tên, ảnh đại diện, vai trò và mảng phụ trách trên trang Đội ngũ công khai của Bên A trong thời gian tham gia.",
  "Được cấp huy hiệu vai trò tương ứng trên tài khoản Arex và các quyền thao tác đúng với công việc được giao.",
  "Được ghi nhận tác giả với nội dung do mình sản xuất; bài viết, thiết kế, video đều để tên hoặc biệt danh của thành viên.",
  "Được đội ngũ hướng dẫn, cấp tài liệu, công cụ và quyền truy cập cần thiết để làm việc.",
  "Được tham gia thảo luận, đề xuất và biểu quyết trong các quyết định thuộc mảng mình phụ trách.",
  "Được nhận hỗ trợ, thù lao hoặc phần thưởng nếu hai bên có thỏa thuận riêng ghi trong hợp đồng.",
];

/** Nghĩa vụ của thành viên — ghép vào điều khoản nghĩa vụ Bên B. */
export const MEMBER_DUTIES: string[] = [
  "Thực hiện công việc thuộc vai trò và mảng phụ trách đã nhận, theo mức cam kết ghi trong hợp đồng.",
  "Chỉ dùng quyền hạn được cấp cho đúng công việc; không tự ý sửa, xóa dữ liệu ngoài phạm vi phụ trách.",
  "Giữ bí mật tài khoản, mật khẩu, khóa truy cập được cấp; không chia sẻ cho người thứ ba dù là người quen.",
  "Không sao chép, mang ra ngoài hay dùng dữ liệu người dùng của Arex cho mục đích riêng.",
  "Bảo đảm nội dung mình đăng là do mình làm hoặc có quyền sử dụng hợp pháp, ghi rõ nguồn khi trích dẫn.",
  "Không nhân danh Arex để phát ngôn, giao dịch, nhận tiền hoặc hứa hẹn quyền lợi khi chưa được giao nhiệm vụ.",
  "Thông báo trước khi tạm dừng hoặc rời đội và bàn giao lại công việc, tài khoản, quyền truy cập.",
];

// ── Đối tác kỹ thuật ─────────────────────────────────────────────────────────

/** Quyền lợi Arex cam kết với đối tác kỹ thuật. */
export const TECH_BENEFITS: string[] = [
  "Được ghi nhận là đối tác kỹ thuật trên trang Hợp tác & Đối tác và trong phần ghi công của sản phẩm liên quan.",
  "Được Bên A cung cấp yêu cầu kỹ thuật rõ ràng, dữ liệu mẫu, môi trường thử nghiệm và đầu mối liên hệ cố định.",
  "Được cấp quyền truy cập tối thiểu cần thiết cho hạng mục phụ trách, đúng thời gian làm việc.",
  "Được Bên A phản hồi nghiệm thu trong thời hạn thỏa thuận, không để hạng mục treo vô thời hạn.",
  "Được thanh toán đúng hạn theo giá trị và tiến độ hai bên đã ghi trong hợp đồng, nếu có phát sinh chi phí.",
];

/** Nghĩa vụ của đối tác kỹ thuật. */
export const TECH_DUTIES: string[] = [
  "Thực hiện đúng hạng mục kỹ thuật, đúng tiến độ bàn giao đã ghi trong hợp đồng.",
  "Không cài mã độc, cửa hậu, mã theo dõi hoặc bất kỳ đoạn mã nào không nằm trong phạm vi công việc.",
  "Không thu thập, sao chép, chuyển dữ liệu người dùng của Bên A ra ngoài hệ thống của Bên A dưới mọi hình thức.",
  "Giữ an toàn cho khóa truy cập, mã nguồn, thông tin cấu hình được cấp; báo ngay cho Bên A khi nghi ngờ lộ lọt.",
  "Bàn giao mã nguồn, tài liệu, tài khoản dịch vụ và hướng dẫn vận hành khi hoàn thành hoặc khi chấm dứt hợp đồng.",
  "Khắc phục lỗi thuộc phần mình bàn giao trong thời gian bảo hành đã thỏa thuận, không tính thêm chi phí.",
];

/** Cách chia quyền sở hữu sản phẩm kỹ thuật — chọn khi lập hợp đồng. */
export const IP_OWNERSHIP_OPTIONS = ["arex", "partner", "shared"] as const;
export type IpOwnership = (typeof IP_OWNERSHIP_OPTIONS)[number];

export const IP_OWNERSHIP_LABEL: Record<IpOwnership, string> = {
  arex: "Arex sở hữu sản phẩm bàn giao",
  partner: "Đối tác giữ quyền sở hữu, Arex được cấp quyền dùng",
  shared: "Hai bên đồng sở hữu",
};

export const IP_OWNERSHIP_CLAUSE: Record<IpOwnership, string> = {
  arex: "Toàn bộ mã nguồn, thiết kế, tài liệu do Bên B tạo ra riêng cho hợp đồng này thuộc quyền sở hữu của Bên A kể từ khi bàn giao và được thanh toán đủ (nếu có phát sinh chi phí). Bên B được nêu sản phẩm trong hồ sơ năng lực của mình nhưng không được bán lại cho bên thứ ba.",
  partner: "Bên B giữ quyền sở hữu sản phẩm và cấp cho Bên A quyền sử dụng không độc quyền, không giới hạn thời gian trong phạm vi hoạt động của Bên A. Bên B không được rút quyền sử dụng này sau khi hợp đồng chấm dứt.",
  shared: "Sản phẩm do hai bên cùng tạo ra thuộc sở hữu chung. Mỗi bên được tự do sử dụng cho hoạt động của mình; việc chuyển nhượng hoặc bán cho bên thứ ba phải có đồng ý bằng văn bản của bên còn lại.",
};

// ── Nội dung giới thiệu trang ────────────────────────────────────────────────

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

/** Bốn bước từ lúc mở biểu mẫu tới lúc hợp đồng có hiệu lực. */
export const PARTNERSHIP_PROCESS: Array<{ step: string; title: string; desc: string }> = [
  {
    step: "01",
    title: "Chọn hình thức & điền",
    desc: "Chọn hợp tác đội nhóm, tham gia đội ngũ hay đối tác kỹ thuật, rồi điền nội dung hai bên thống nhất.",
  },
  {
    step: "02",
    title: "Thêm điều khoản riêng",
    desc: "Bạn được tự đưa thêm điều khoản của mình vào hợp đồng — không phải ký nguyên mẫu có sẵn.",
  },
  {
    step: "03",
    title: "Đọc toàn văn & ký",
    desc: "Hợp đồng hiện đầy đủ trước khi ký. Bạn ký điện tử trên trình duyệt, hệ thống chụp lại toàn văn.",
  },
  {
    step: "04",
    title: "Arex ký & triển khai",
    desc: "Arex thẩm định trong tối đa 03 ngày làm việc rồi ký lại. Hợp đồng có hiệu lực, hai bên giữ bản giống nhau.",
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
    q: "Arex ký hợp đồng với những ai?",
    a: "Ba nhóm: đội – clan – cộng đồng – kênh muốn hợp tác với Arex; cá nhân muốn tham gia đội ngũ Arex làm nội dung, kiểm duyệt, thiết kế, kỹ thuật; và đối tác kỹ thuật nhận làm hoặc hỗ trợ một hạng mục cụ thể. Chọn đúng hình thức ở bước đầu tiên của trang ký hợp đồng.",
  },
  {
    q: "Không phải công ty, không có giấy tờ doanh nghiệp thì ký được không?",
    a: "Được. Đây là hợp đồng giữa đội nhóm và cá nhân trong cộng đồng, không phải hợp đồng thương mại giữa hai doanh nghiệp. Biểu mẫu không hỏi căn cước, mã số thuế hay giấy đăng ký kinh doanh — chỉ cần tên đội hoặc biệt danh, người ký, email và một kênh liên lạc thật.",
  },
  {
    q: "Ký điện tử trên website có giá trị không?",
    a: "Có. Luật Giao dịch điện tử 2023 công nhận thông điệp dữ liệu có giá trị như văn bản, và chữ ký điện tử theo thỏa thuận của các bên có giá trị ràng buộc với chính các bên đó. Hệ thống lưu toàn văn điều khoản lúc ký, mã kiểm tra toàn vẹn SHA-256, hình ảnh chữ ký, thời điểm, địa chỉ IP và thiết bị của cả hai bên.",
  },
  {
    q: "Tôi muốn thêm điều khoản của riêng mình vào hợp đồng?",
    a: "Đây là điều được khuyến khích. Ở bước “Điều khoản riêng”, bạn thêm tối đa 10 điều khoản, tự đặt tiêu đề và nội dung, hoặc chọn từ mẫu có sẵn như độc quyền, gia hạn tự động, ghi nhận tác giả, chia sẻ doanh thu. Các điều khoản này nằm ngay trong hợp đồng và có giá trị ngang các điều khoản còn lại.",
  },
  {
    q: "Tham gia đội ngũ Arex có phải là đi làm không?",
    a: "Không. Hợp đồng thành viên ghi rõ đây là hợp tác cộng đồng tự nguyện, không phát sinh quan hệ lao động, không có lương, bảo hiểm hay chấm công theo Bộ luật Lao động — trừ khoản hỗ trợ, thù lao mà hai bên tự ghi vào hợp đồng.",
  },
  {
    q: "Chưa đủ 18 tuổi có ký được không?",
    a: "Được, nhưng cần người đại diện theo pháp luật (cha, mẹ hoặc người giám hộ) đồng ý và ghi tên, quan hệ, số liên lạc trong hợp đồng, theo Điều 21 Bộ luật Dân sự 2015. Phần này tự hiện khi ngày sinh bạn nhập cho thấy chưa đủ 18 tuổi. Hệ thống không hỏi giấy tờ tùy thân của người đại diện.",
  },
  {
    q: "Muốn dừng giữa chừng thì sao?",
    a: "Mỗi bên được đơn phương chấm dứt bằng thông báo trước — 15 ngày với hợp tác đội nhóm và đối tác kỹ thuật, 07 ngày với thành viên đội ngũ. Khi chấm dứt, Arex gỡ tên, logo khỏi trang công khai trong 05 ngày làm việc và thu hồi các quyền đã cấp.",
  },
  {
    q: "Dữ liệu tôi điền được dùng vào việc gì?",
    a: "Chỉ để giao kết, thực hiện, lưu trữ hợp đồng và liên hệ công việc. Arex không bán, không chuyển cho bên thứ ba ngoài trường hợp pháp luật yêu cầu, theo Nghị định 13/2023/NĐ-CP. Bạn có quyền yêu cầu xem, sửa hoặc xóa dữ liệu qua email liên hệ trên trang.",
  },
];
