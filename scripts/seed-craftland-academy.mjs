#!/usr/bin/env node
/**
 * Đăng các bài hướng dẫn Craftland Academy do ArexNetwork biên soạn.
 *
 * - Nội dung là lời giải thích riêng; ví dụ là MINH HOẠ dựng từ chữ ký trong
 *   chỉ mục chính thức (src/lib/data/craftland-api-index.json).
 * - Trước khi ghi, script kiểm tra mọi tên hàm / sự kiện được nhắc trong bài
 *   có thật trong chỉ mục — sai một tên là dừng, không đăng.
 * - Upsert theo slug: chạy lại sẽ cập nhật bài, không tạo trùng.
 *
 * Chạy: node scripts/seed-craftland-academy.mjs [--draft]
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const STATUS = process.argv.includes("--draft") ? "draft" : "published";
const index = JSON.parse(fs.readFileSync("src/lib/data/craftland-api-index.json", "utf8"));
const DOCS = "https://ffcraftland.garena.com/vn/docs";
const REF = "/community/craftland/academy/api";

// ── Số liệu lấy thẳng từ chỉ mục, không gõ tay ─────────────────
const all = (sec) => index.sections[sec].groups.flatMap((g) => g.items);
const stat = (sec) => ({ total: all(sec).length, obsolete: all(sec).filter((i) => i.obsolete).length, groups: index.sections[sec].groups.length });
const S = { api: stat("api"), event: stat("event"), type: stat("type") };
const groupSize = (sec, title) => index.sections[sec].groups.find((g) => g.title.trim() === title)?.items.length ?? 0;
const knownNames = new Set(
  [...all("api"), ...all("event")]
    .map((i) => /(?:func|event)\s+([A-Za-z0-9_]+)/.exec(i.signature ?? "")?.[1])
    .filter(Boolean),
);
const fmt = new Intl.NumberFormat("vi-VN");

const code = (s) => `<pre><code>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
const ref = (sec, groupKey, label) => `<a href="${REF}/${sec}/${groupKey}">${label}</a>`;

const ARTICLES = [
  {
    slug: "ban-do-he-thong-api-craftland",
    category_slug: "api-std",
    sort_order: 10,
    platform: "both",
    title: "Bản đồ hệ thống API Craftland: module, sự kiện và kiểu dữ liệu",
    excerpt: `Craftland có ${fmt.format(S.api.total)} API chia thành ${S.api.groups} module, ${fmt.format(S.event.total)} sự kiện và ${fmt.format(S.type.total)} kiểu dữ liệu. Bài này giúp bạn biết nên tìm ở đâu.`,
    sources: [
      { label: "Tài liệu API chính thức (Garena)", url: `${DOCS}/api/` },
      { label: "Danh sách sự kiện chính thức", url: `${DOCS}/event/` },
    ],
    body: `
<p>Khi mới mở tài liệu Craftland, nhiều người choáng vì số lượng: <strong>${fmt.format(S.api.total)} API</strong>, <strong>${fmt.format(S.event.total)} sự kiện</strong> và <strong>${fmt.format(S.type.total)} kiểu dữ liệu</strong>. Tin tốt là bạn không cần nhớ hết. Chỉ cần hiểu cách chúng được sắp xếp là tra cứu rất nhanh.</p>

<h2>Ba loại thứ bạn sẽ gặp</h2>
<ul>
<li><strong>API (hàm)</strong> — việc bạn <em>ra lệnh</em> cho trò chơi làm: lấy danh sách người chơi, chờ vài giây, cho ai đó vào đội… Mỗi API có một chữ ký bắt đầu bằng <code>func</code> hoặc <code>async func</code>.</li>
<li><strong>Sự kiện</strong> — việc trò chơi <em>báo cho bạn</em> biết vừa xảy ra: trận bắt đầu, người chơi tham gia, một vòng kết thúc… Chữ ký bắt đầu bằng <code>event</code>, ví dụ <code>event OnPlayerJoin(player entity&lt;Player&gt;)</code>.</li>
<li><strong>Kiểu dữ liệu</strong> — "hình dạng" của giá trị: <code>int</code>, <code>bool</code>, <code>string</code>, <code>Vector3</code>, <code>Color</code>, <code>List&lt;…&gt;</code>, <code>entity&lt;Player&gt;</code>…</li>
</ul>
<p>Một kịch bản trong Craftland gần như luôn có dạng: <strong>khi [sự kiện] xảy ra → gọi [API] với [dữ liệu đúng kiểu]</strong>.</p>

<h2>Các module API theo nhóm công việc</h2>
<p>Garena chia API thành ${S.api.groups} module. Gom theo mục đích sử dụng:</p>
<ul>
<li><strong>Nền tảng</strong>: ${ref("api", "thu-vien-std", "Thư viện STD")} (${groupSize("api", "Thư viện STD")} mục — chờ, in log, tạo/xoá thực thể, nhãn, tập lệnh), ${ref("api", "danh-sach", "Danh sách")}, ${ref("api", "tu-dien", "Từ điển")}, ${ref("api", "toan-hoc", "Toán học")} (${groupSize("api", "Toán học")} mục), ${ref("api", "chuoi", "Chuỗi")}, ${ref("api", "chuyen-doi", "Chuyển đổi")}.</li>
<li><strong>Người chơi & đội</strong>: ${ref("api", "nguoi-choi", "Người chơi")} (${groupSize("api", "Người chơi")} mục), ${ref("api", "doi", "Đội")}, ${ref("api", "chien-dau", "Chiến đấu")}, ${ref("api", "vat-pham", "Vật phẩm")}, ${ref("api", "vong-bo", "Vòng bo")}.</li>
<li><strong>Luồng trận đấu</strong>: ${ref("api", "quy-trinh-cong-viec", "Quy trình công việc")}, ${ref("api", "thoi-gian-tran-dau", "Thời gian trận đấu")}, ${ref("api", "ket-qua-tran-dau", "Kết quả trận đấu")}.</li>
<li><strong>Giao diện & trình bày</strong>: ${ref("api", "giao-dien-hud", "Giao diện HUD")} (${groupSize("api", "Giao diện HUD")} mục), ${ref("api", "may-quay", "Máy quay")}, ${ref("api", "hoat-anh", "Hoạt ảnh")}, ${ref("api", "ban-do-nho", "Bản đồ nhỏ")}.</li>
<li><strong>Thế giới & vật lý</strong>: ${ref("api", "vat-ly", "Vật lý")} (${groupSize("api", "Vật lý")} mục), ${ref("api", "cap-vat-the", "Cấp vật thể")}, ${ref("api", "truong-canh", "Trường cảnh")}.</li>
<li><strong>Dữ liệu lâu dài</strong>: ${ref("api", "luu-tru-du-lieu", "Lưu trữ dữ liệu")} (${groupSize("api", "Lưu trữ dữ liệu")} mục — module lớn thứ hai), ${ref("api", "tai-chinh", "Tài chính")}, ${ref("api", "suu-tam", "Sưu tầm")}.</li>
</ul>

<h2>Mẹo tra cứu</h2>
<ul>
<li>Biết tên tiếng Việt của khối trong Studio? Gõ thẳng vào ô tìm kiếm của <a href="${REF}">trang tra cứu API</a>.</li>
<li>Thấy tên hàm tiếng Anh trong một bài hướng dẫn (VD <code>GetAllPlayers</code>)? Tìm cũng được — chỉ mục tìm cả trong chữ ký.</li>
<li>Mục có nhãn <strong>Hết hạn</strong>: đừng dùng cho dự án mới. Hiện có ${S.api.obsolete} API và ${S.event.obsolete} sự kiện bị đánh dấu như vậy — xem bài <a href="/community/craftland/academy/api-het-han-nhan-dien-va-thay-the">API hết hạn: nhận diện và thay thế</a>.</li>
</ul>
`,
  },
  {
    slug: "doc-hieu-chu-ky-ham-craftland",
    category_slug: "scripting",
    sort_order: 10,
    platform: "both",
    title: "Đọc hiểu chữ ký hàm trong tài liệu Craftland",
    excerpt: "func, async func, out var, entity<Player>, List<…> — giải nghĩa từng thành phần để bạn đọc tài liệu API mà không cần đoán.",
    sources: [
      { label: "Thư viện STD (Garena)", url: `${DOCS}/module-1/` },
      { label: "Danh sách kiểu dữ liệu (Garena)", url: `${DOCS}/type/` },
    ],
    body: `
<p>Mỗi mục trong tài liệu API Craftland có một dòng <strong>khai báo</strong> — gọi là chữ ký. Đọc được chữ ký là bạn biết khối đó cần gì và trả lại gì, trước cả khi kéo nó vào Studio.</p>
<blockquote>Tài liệu chính thức viết chữ ký theo cú pháp giống ngôn ngữ Go. Trong Craftland Studio bạn thường lắp các <strong>khối</strong> có cùng tên tiếng Việt; chữ ký chỉ là cách mô tả chính xác khối đó.</blockquote>

<h2>1. Hàm đơn giản: tên và tham số</h2>
${code("func LogInfo(content object)")}
<ul>
<li><code>func</code>: đây là một hàm (một hành động).</li>
<li><code>LogInfo</code>: tên hàm. Trong Studio là khối <strong>In thông báo</strong>.</li>
<li><code>content object</code>: một tham số tên <code>content</code>, kiểu <code>object</code> — nghĩa là nhận gần như mọi loại giá trị.</li>
<li>Không có gì sau dấu ngoặc đóng → hàm <strong>không trả về</strong> giá trị.</li>
</ul>

<h2>2. Hàm có giá trị trả về</h2>
${code("func GetAllPlayers() List<entity<Player>>")}
<p>Phần sau dấu ngoặc là kiểu trả về: một <code>List</code> (danh sách) mà mỗi phần tử là <code>entity&lt;Player&gt;</code> — một thực thể người chơi. Bạn có thể đưa kết quả này thẳng vào các khối của module ${ref("api", "danh-sach", "Danh sách")}, ví dụ <code>Length</code> để đếm số người chơi.</p>

<h2>3. <code>async func</code>: hàm cần thời gian</h2>
${code("async func WaitForMillisecond(duration int)\nasync func WaitForNextFrame()")}
<p><code>async</code> báo hiệu hàm này <strong>không xong ngay</strong>: kịch bản sẽ dừng ở đó cho tới khi chờ đủ. <code>duration int</code> là số mili giây (1000 = 1 giây). Đây là cách tạo đếm ngược, nhịp spawn quái, v.v.</p>

<h2>4. <code>out var</code>: kết quả trả qua biến</h2>
${code("func CreateFromPrefab(out var createdEntity entity<Entity>, prefab PrefabID)\nfunc JoinTeam(target entity<Entity>, targetTeam entity<Team>, out var statusCode StatusCode)")}
<p>Một số hàm không "trả về" theo kiểu thường mà <strong>ghi kết quả vào biến bạn chỉ định</strong> — đánh dấu bằng <code>out var</code>. Với <code>CreateFromPrefab</code>, thực thể vừa tạo nằm trong biến <code>createdEntity</code>. Với <code>JoinTeam</code>, biến <code>statusCode</code> cho biết thao tác thành công hay gặp lỗi — nên kiểm tra nó thay vì giả định mọi thứ ổn.</p>

<h2>5. Kiểu có tham số: <code>entity&lt;…&gt;</code> và <code>List&lt;…&gt;</code></h2>
<ul>
<li><code>entity</code> — một thực thể bất kỳ trong cảnh.</li>
<li><code>entity&lt;Player&gt;</code>, <code>entity&lt;Team&gt;</code> — thực thể <em>chỉ</em> thuộc loại người chơi / đội. Đưa nhầm loại vào là khối không lắp được.</li>
<li><code>List&lt;object&gt;</code> — danh sách phần tử bất kỳ; <code>List&lt;string&gt;</code> — danh sách chuỗi.</li>
</ul>

<h2>6. Không phải hàm: từ khoá và giá trị đặc biệt</h2>
<p>Vài mục trong Thư viện STD không phải hàm mà là cấu trúc ngôn ngữ: <code>break</code> (thoát vòng lặp), <code>continue</code> (bỏ qua lượt hiện tại), <code>!</code> (phủ định — khối <strong>KHÔNG</strong>), <code>if(value==nil)</code> (khối <strong>Kiểm tra trống</strong>), <code>thisEntity</code> (thực thể đang chạy kịch bản), <code>globalEntity</code> (thực thể toàn cục của thế giới).</p>

<h2>Thử đọc một chữ ký khó</h2>
${code("func FilterEntity(must TypeOrTypeList, not TypeOrTypeList, any TypeOrTypeList) List<entity<Entity>>")}
<p>Đọc từng phần: nhận ba bộ lọc kiểu — <em>phải có</em>, <em>không được có</em>, <em>có ít nhất một</em> — và trả về danh sách thực thể khớp. Tra từng kiểu lạ (như <code>TypeOrTypeList</code>) ở mục Kiểu trong <a href="${REF}">trang tra cứu</a>.</p>
`,
  },
  {
    slug: "su-kien-vong-doi-tran-dau",
    category_slug: "module-su-kien",
    sort_order: 10,
    platform: "both",
    title: "Sự kiện vòng đời: từ lúc trận bắt đầu đến khi kết thúc",
    excerpt: "Những sự kiện bạn sẽ dùng trong hầu hết bản đồ: khởi tạo thực thể, cập nhật mỗi khung hình, người chơi vào/ra, vòng đấu và giai đoạn.",
    sources: [
      { label: "Sự kiện — Thư viện STD (Garena)", url: `${DOCS}/event/` },
      { label: "Quy trình công việc (Garena)", url: `${DOCS}/module-18/` },
    ],
    body: `
<p>Kịch bản Craftland phản ứng theo <strong>sự kiện</strong>. Hiểu thứ tự các sự kiện quan trọng là nền tảng để map chạy đúng. Bài này gom những sự kiện dùng nhiều nhất theo "đời sống" của một trận đấu.</p>

<h2>1. Đời sống của một thực thể</h2>
${code("event OnAwake()\nevent OnEnable()\nevent OnDisable()\nevent OnDestroy()")}
<ul>
<li><strong>Khi Thực thể được tạo</strong> (<code>OnAwake</code>) — chỗ hợp lý để khởi tạo giá trị ban đầu.</li>
<li><strong>Khi Thực thể có sẵn / không khả dụng</strong> (<code>OnEnable</code> / <code>OnDisable</code>) — đi cặp với khối <code>SetActive</code> (bật/tắt thực thể).</li>
<li><strong>Khi thực thể bị phá hủy</strong> (<code>OnDestroy</code>) — dọn dẹp, ví dụ gỡ thực thể khỏi danh sách bạn đang theo dõi.</li>
</ul>

<h2>2. Nhịp cập nhật</h2>
${code("event OnUpdate()\nevent OnLateUpdate()\nevent OnFixedUpdate()")}
<p>Ba sự kiện này chạy lặp đi lặp lại trong suốt trận. Quy tắc an toàn: <strong>đừng đặt việc nặng vào đây</strong> (duyệt toàn bộ người chơi, tạo thực thể…) vì nó chạy rất nhiều lần. Việc theo chu kỳ vài giây nên dùng vòng lặp với <code>WaitForMillisecond</code> thay vì đếm khung hình. Module ${ref("api", "thoi-gian-tran-dau", "Thời gian trận đấu")} có <code>PauseFixedUpdate</code> / <code>ResumeFixedUpdate</code> để tạm dừng nhịp cố định.</p>

<h2>3. Người chơi vào, ra, kết nối lại</h2>
${code("event OnPlayerJoin(player entity<Player>)\nevent OnPlayerQuit(player entity<Player>)\nevent OnDisconnect(player entity<Player>)\nevent OnReconnect(player entity<Player>)")}
<p>Mỗi sự kiện đưa sẵn tham số <code>player</code> — chính người chơi vừa tham gia/thoát. Ví dụ minh hoạ khi có người vào trận:</p>
${code("// Minh hoạ theo chữ ký — trong Studio lắp bằng khối cùng tên\nevent OnPlayerJoin(player entity<Player>)\n    LogInfo(player)                     // In thông báo để kiểm tra khi thử map\n    JoinNewTeam(player, out var team, out var status)")}
<p>Đừng quên <code>OnReconnect</code>: người rớt mạng quay lại có thể cần được khôi phục trạng thái (đội, vị trí, điểm) mà bạn đã gán lúc đầu.</p>

<h2>4. Vòng đấu và giai đoạn</h2>
${code("event OnRoundStart(roundIndex int)\nevent OnRoundEnd(roundIndex int)\nevent OnPhaseStart(phase entity<Phase>)\nevent OnPhaseEnd(phase entity<Phase>)\n\nfunc SwitchPhase(phaseIndex int)\nfunc EndCurrentPhase()")}
<p>Module ${ref("api", "quy-trinh-cong-viec", "Quy trình công việc")} chỉ có 2 API nhưng là "xương sống" của map nhiều màn: chia trận thành các <strong>giai đoạn</strong> (chuẩn bị → thi đấu → tổng kết), dùng <code>SwitchPhase</code> hoặc <code>EndCurrentPhase</code> để chuyển, và lắng nghe <code>OnPhaseStart</code>/<code>OnPhaseEnd</code> để bật/tắt luật tương ứng.</p>

<h2>5. Kết thúc trận</h2>
${code("event OnGameEnd()\nevent OnUserQuitOrUserMatchEnd(player entity<Player>)\nfunc UploadGameResult(target entity<Player>, result GameResultType, scoreName List<string>, score List<string>)")}
<p><code>UploadGameResult</code> gửi kết quả của từng người chơi, với hai danh sách song song: tên chỉ số và giá trị. Lưu ý toàn bộ API cũ trong module ${ref("api", "ket-qua-tran-dau", "Kết quả trận đấu")} hiện đã bị đánh dấu hết hạn.</p>

<h2>6. Tự tạo sự kiện riêng</h2>
${code("func DispatchEvent(eventID EventID, target entity, params List<object>)\nfunc BroadcastCustomEvent(eventID EventID, platform PlatformType, params List<object>)")}
<p>Khi nhiều kịch bản cần "nói chuyện" với nhau (VD: nút bấm mở cửa ở nơi khác), hãy gửi sự kiện tuỳ chỉnh thay vì để các kịch bản đọc biến của nhau — dễ bảo trì hơn nhiều.</p>
`,
  },
  {
    slug: "cho-lap-va-debug-trong-craftland",
    category_slug: "kiem-thu",
    sort_order: 10,
    platform: "both",
    title: "Chờ, lặp và debug: bộ khối bạn dùng mỗi ngày",
    excerpt: "WaitForMillisecond, WaitForNextFrame, break/continue và ba mức log LogInfo / LogWarning / LogError — cách dùng để map chạy đúng và dễ sửa lỗi.",
    sources: [{ label: "Thư viện STD (Garena)", url: `${DOCS}/module-1/` }],
    body: `
<h2>Chờ đợi</h2>
${code("async func WaitForMillisecond(duration int)\nasync func WaitForNextFrame()")}
<ul>
<li><strong>Chờ đợi đến mili giây tiếp theo</strong> — dừng kịch bản <code>duration</code> mili giây. Dùng cho đếm ngược, giãn cách giữa các đợt quái, hiệu ứng có thời gian.</li>
<li><strong>Chờ đợi đến khung hình tiếp theo</strong> — dừng đúng một khung hình. Hữu ích khi cần để trò chơi xử lý xong việc vừa làm (VD: vừa tạo thực thể) trước khi bước tiếp.</li>
</ul>
<p>Ví dụ minh hoạ một đếm ngược 3 giây trước khi cho người chơi di chuyển:</p>
${code("// Minh hoạ theo chữ ký\nSetAllPlayersMoveStatus(false)\nfor i = 3 down to 1\n    LogInfo(i)\n    WaitForMillisecond(1000)\nSetAllPlayersMoveStatus(true)")}

<h2>Điều khiển vòng lặp</h2>
<p><code>break</code> (<strong>Phá vỡ vòng lặp</strong>) thoát hẳn vòng lặp; <code>continue</code> (<strong>Bấm tiếp tục để chuyển</strong>) bỏ qua phần còn lại của lượt hiện tại và sang lượt kế. Ví dụ: duyệt <code>GetAllPlayers()</code>, gặp người đã bị loại thì <code>continue</code>; tìm thấy người thắng thì <code>break</code>.</p>
<blockquote>Vòng lặp chạy mãi mà không có <code>WaitForMillisecond</code> hoặc <code>WaitForNextFrame</code> bên trong là nguyên nhân phổ biến khiến map đứng hình.</blockquote>

<h2>Ba mức log để debug</h2>
${code("func LogInfo(content object)\nfunc LogWarning(content object)\nfunc LogError(content object)")}
<ul>
<li><strong>In thông báo</strong> (<code>LogInfo</code>) — theo dõi luồng chạy: "đã vào giai đoạn 2", "đội A còn 3 người".</li>
<li><strong>In cảnh báo</strong> (<code>LogWarning</code>) — điều bất thường nhưng chưa hỏng: danh sách rỗng, không tìm thấy điểm hồi sinh.</li>
<li><strong>In lỗi</strong> (<code>LogError</code>) — việc chắc chắn sai: <code>statusCode</code> báo thất bại, thực thể cần thiết bị trống.</li>
</ul>
<p>Thói quen tốt: sau mỗi hàm có <code>out var statusCode</code> hoặc <code>out var isSuccess</code>, kiểm tra kết quả và <code>LogError</code> nếu thất bại. Kết hợp khối <strong>Kiểm tra trống</strong> (<code>if(value==nil)</code>) trước khi dùng một thực thể có thể đã bị phá huỷ.</p>

<h2>Checklist trước khi xuất bản map</h2>
<ul>
<li>Đã thử với đủ số người chơi tối đa, và với 1 người.</li>
<li>Đã thử thoát giữa trận và kết nối lại (<code>OnPlayerQuit</code>, <code>OnReconnect</code>).</li>
<li>Không còn API có nhãn <strong>Hết hạn</strong> trong kịch bản.</li>
<li>Đã gỡ bớt <code>LogInfo</code> dư thừa trong <code>OnUpdate</code>.</li>
</ul>
`,
  },
  {
    slug: "danh-sach-list-trong-craftland",
    category_slug: "api-std",
    sort_order: 20,
    platform: "both",
    title: "Làm việc với Danh sách (List): chia đội, chọn ngẫu nhiên, xếp hạng",
    excerpt: `Module Danh sách có ${groupSize("api", "Danh sách")} thao tác. Đây là công cụ bạn dùng cho mọi thứ liên quan tới "nhiều người chơi", "nhiều vật phẩm".`,
    sources: [
      { label: "Danh sách (Garena)", url: `${DOCS}/module-2/` },
      { label: "Đội (Garena)", url: `${DOCS}/module-29/` },
    ],
    body: `
<p>Hễ có "nhiều" thứ — nhiều người chơi, nhiều đội, nhiều điểm hồi sinh — là bạn cần <strong>Danh sách</strong>. Nhiều API trả về danh sách sẵn, ví dụ <code>GetAllPlayers()</code> trả về <code>List&lt;entity&lt;Player&gt;&gt;</code>.</p>

<h2>Các thao tác hay dùng nhất</h2>
${code("func Length(target List<object>) int\nfunc Append(target List<object>, value object)\nfunc Remove(target List<object>, value object)\nfunc RemoveAt(target List<object>, index int)\nfunc Contain(target List<object>, value object) bool\nfunc IndexOf(target List<object>, value object) int\nfunc Shuffle(target List<object>)\nfunc Clone(target List<object>) List<object>\nfunc Clear(target List<object>)")}
<ul>
<li><strong>Chiều dài</strong> — đếm phần tử (VD: còn bao nhiêu người sống).</li>
<li><strong>Nối / Xóa / Xóa tại</strong> — thêm bớt phần tử. <code>Remove</code> xoá theo giá trị, <code>RemoveAt</code> xoá theo vị trí.</li>
<li><strong>Chứa</strong> — kiểm tra một người có trong danh sách chưa, trước khi thêm để tránh trùng.</li>
<li><strong>Xáo trộn</strong> — đảo ngẫu nhiên thứ tự, nền tảng của mọi cơ chế "chọn ngẫu nhiên".</li>
<li><strong>Bản sao</strong> — tạo danh sách mới để xử lý mà không làm hỏng danh sách gốc.</li>
</ul>

<h2>Ví dụ 1: chia người chơi thành 2 đội ngẫu nhiên</h2>
${code("// Minh hoạ theo chữ ký\nvar players = Clone(GetAllPlayers())\nShuffle(players)\nvar teams = GetAllTeams()\nfor i = 0 to Length(players) - 1\n    var team = teams[i % 2]\n    JoinTeam(players[i], team, out var status)\n    // kiểm tra status, LogError nếu thất bại")}
<p>Vì sao <code>Clone</code> trước khi <code>Shuffle</code>? Để không thay đổi thứ tự của danh sách gốc nếu chỗ khác trong map cũng đang dùng nó.</p>

<h2>Ví dụ 2: danh sách người còn sống</h2>
${code("// Minh hoạ theo chữ ký\nevent OnPlayerQuit(player entity<Player>)\n    if Contain(alive, player)\n        Remove(alive, player)\n    if Length(alive) == 1\n        // còn 1 người → kết thúc giai đoạn\n        EndCurrentPhase()")}

<h2>Giá trị lớn nhất / nhỏ nhất</h2>
${code("func Max(target List<object>, out var isSuccess bool, out var result Number)\nfunc Min(target List<object>, out var isSuccess bool, out var result Number)")}
<p>Hai hàm này trả kết quả qua <code>out var</code> kèm cờ <code>isSuccess</code> — sẽ thất bại nếu danh sách rỗng hoặc không phải số. Luôn kiểm tra <code>isSuccess</code> trước khi dùng <code>result</code>.</p>

<p>Danh sách đầy đủ: ${ref("api", "danh-sach", "module Danh sách")}. Cần ánh xạ khoá → giá trị (VD: người chơi → điểm)? Xem ${ref("api", "tu-dien", "module Từ điển")}.</p>
`,
  },
  {
    slug: "api-het-han-nhan-dien-va-thay-the",
    category_slug: "kiem-thu",
    sort_order: 20,
    platform: "both",
    title: "API hết hạn: nhận diện và thay thế",
    excerpt: `${S.api.obsolete} API và ${S.event.obsolete} sự kiện đang bị Garena đánh dấu hết hạn. Cách nhận biết và hướng xử lý khi nâng cấp map cũ.`,
    sources: [
      { label: "Tài liệu API chính thức (Garena)", url: `${DOCS}/api/` },
      { label: "Ghi chú cập nhật Craftland", url: "https://ffcraftland.garena.com/vn/patch-notes/" },
    ],
    body: `
<p>Craftland cập nhật liên tục, và một số API cũ được thay bằng bản mới. Theo chỉ mục đồng bộ gần nhất, có <strong>${S.api.obsolete} API</strong> và <strong>${S.event.obsolete} sự kiện</strong> mang nhãn <strong>[Hết hạn]</strong>.</p>

<h2>Nhận diện</h2>
<ul>
<li>Tên khối có hậu tố <strong>[Hết hạn]</strong> trong tài liệu và trong <a href="${REF}">trang tra cứu</a> (nhãn vàng, gom ở cuối mỗi module).</li>
<li>Tên hàm thường kết thúc bằng <code>_Deprecated</code>, ví dụ <code>TeleportPlayer_Deprecated</code>, <code>CreateTextEntity_Deprecated</code>.</li>
</ul>

<h2>Có bản mới cạnh bản cũ</h2>
<p>Với một số API, chỉ mục có một hàm mới cùng tên gốc hoặc cùng mục đích:</p>
${code("// Hết hạn                                   // Đang dùng\nfunc NotifyPlaySound(...)                 →  func NotifyPlaySoundV2(target entity<Player>, resource AudioID, speed float)\nfunc PlayOneShotSound(...)                →  func PlayOneShotSoundV2(resource AudioID, speed float)\nfunc SetMatchResult_Deprecate(...)        →  func UploadGameResult(target entity<Player>, result GameResultType, scoreName List<string>, score List<string>)")}
<p>Hai cặp âm thanh có hậu tố <code>V2</code> rõ ràng là bản kế nhiệm. Cặp thứ ba là <strong>suy luận của ArexNetwork</strong> từ tên và tham số (<code>UploadGameResult</code> nằm ở Thư viện STD, không cùng module) — hãy xác nhận trong tài liệu chính thức. Tham số của bản mới <strong>không giống hệt</strong> bản cũ (VD: <code>SoundEffectType</code> đổi sang <code>AudioID</code>), nên không chỉ đổi tên khối là xong — hãy đọc lại chữ ký và tài liệu chính thức trước khi thay.</p>

<h2>Những nhóm thay đổi lớn</h2>
<ul>
<li><strong>Hiệu ứng, văn bản, biểu tượng, âm thanh kiểu cũ</strong> trong Thư viện STD (<code>CreateEffectEntity_Deprecated</code>, <code>CreateSoundEntity_Deprecated</code>…) đều đã hết hạn.</li>
<li><strong>Phe phái</strong> (<code>CreateFaction</code>, <code>JoinFaction</code>…) trong module Đội đã hết hạn; các API đang dùng xoay quanh <strong>Đội</strong> và thực thể: <code>JoinTeam</code>, <code>JoinNewTeam</code>, <code>SetAttackableTeam</code>, <code>SetAttackableEntity</code>.</li>
<li><strong>Điểm số & xếp hạng</strong>: toàn bộ ${groupSize("api", "Kết quả trận đấu")} API của module Kết quả trận đấu và các sự kiện đổi điểm (<code>OnPlayerScoreChange</code>…) đều đã hết hạn.</li>
</ul>

<h2>Quy trình nâng cấp map cũ</h2>
<ol>
<li>Mở từng kịch bản, liệt kê các khối có nhãn [Hết hạn].</li>
<li>Tra mỗi khối trong <a href="${REF}">trang tra cứu</a>, tìm khối đang dùng cùng module có chức năng tương tự.</li>
<li>Đối chiếu tham số mới; xem <a href="https://ffcraftland.garena.com/vn/patch-notes/">ghi chú cập nhật</a> nếu không rõ.</li>
<li>Thay từng khối một và thử ngay — đừng thay hàng loạt rồi mới test.</li>
<li>Dùng <code>LogWarning</code> đánh dấu chỗ còn nghi ngờ để rà lại.</li>
</ol>
<blockquote>Bản đồ đang dùng API hết hạn có thể vẫn chạy hôm nay, nhưng không có gì đảm bảo ở bản cập nhật sau. Dự án mới thì đừng dùng chúng.</blockquote>
`,
  },
];

// ── Kiểm tra mọi tên hàm/sự kiện nhắc tới đều có thật ──────────
// Bắt tên đứng trước "(" và tên đứng một mình trong <code>…</code>.
const PREFIX = "(?:On|Get|Set|Create|Join|Log|Wait|Notify|Play|Upload|Dispatch|Broadcast|Switch|End|Pause|Resume|Filter|Append|Remove|Length|Contain|IndexOf|Shuffle|Clone|Clear|Max|Min|Teleport)[A-Za-z0-9_]*";
const unknown = new Set();
for (const a of ARTICLES) {
  const re = new RegExp(`\\b(${PREFIX})\\s*\\(|<code>(${PREFIX})</code>`, "g");
  for (const m of a.body.matchAll(re)) {
    const name = m[1] ?? m[2];
    if (!knownNames.has(name)) unknown.add(name);
  }
}
if (unknown.size) {
  console.error("Tên không có trong chỉ mục:", [...unknown].join(", "));
  process.exit(1);
}
console.log(`Kiểm tra tên: OK (${knownNames.size} tên trong chỉ mục)`);

// ── Ghi vào DB ────────────────────────────────────────────────
const sanitizeOpts = {
  allowedTags: ["p", "b", "strong", "i", "em", "u", "s", "mark", "h1", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "a", "img", "code", "pre", "br", "hr", "span", "div"],
  allowedAttributes: { a: ["href", "target", "rel"] },
};
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const now = new Date().toISOString();

for (const a of ARTICLES) {
  const html = sanitizeHtml(a.body.trim(), sanitizeOpts);
  const text = html.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const { data: existing } = await db.from("craftland_academy_articles").select("id, published_at").eq("slug", a.slug).maybeSingle();
  const row = {
    slug: a.slug,
    category_slug: a.category_slug,
    title: a.title,
    excerpt: a.excerpt,
    body: html,
    body_text: text,
    platform: a.platform,
    sources: a.sources,
    sort_order: a.sort_order,
    status: STATUS,
    published_at: STATUS === "published" ? existing?.published_at ?? now : existing?.published_at ?? null,
  };
  const { data, error } = await db.from("craftland_academy_articles").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error) {
    console.error(`✗ ${a.slug}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  await db.from("craftland_moderation_actions").insert({
    actor_id: "00000000-0000-0000-0000-000000000000",
    actor_email: "system@arex.tech",
    target_type: "academy",
    target_id: data.id,
    action: existing ? "academy_seed_update" : "academy_seed_create",
    reason: "scripts/seed-craftland-academy.mjs",
    metadata: { slug: a.slug, status: STATUS },
  });
  console.log(`${existing ? "↻" : "✓"} ${a.slug} (${STATUS})`);
}
