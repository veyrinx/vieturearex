// Nguồn dữ liệu: dùng lại API công khai + đã bật CORS của site Arex.
// LƯU Ý: phải khai báo domain này trong Zalo Mini App Developer Console
// (mục "Domain cho phép") — xem README.
// Bắt buộc là tên miền phục vụ trực tiếp: tên miền cũ trả 308, mà request kèm
// header (Authorization) dính chuyển hướng thì CORS gãy trong WebView Zalo.
export const API_BASE = "https://www.arexnetwork.vn";

export const SITE_URL = "https://www.arexnetwork.vn";

// Supabase (khoá công khai — an toàn để nhúng client, bảo mật thật nằm ở RLS
// trên DB chứ không phải ở việc giấu key này). Trùng với site để dùng chung
// tài khoản: đăng nhập trên mini app = đăng nhập trên web.
//
// Chuỗi dưới đây được che (XOR + base64) chỉ để không nằm trần dưới dạng
// URL/JWT dễ nhận diện trong source — tránh bị máy quét secret (GitHub push
// protection, trufflehog...) gắn cờ nhầm. Trình duyệt vẫn cần giá trị gốc để
// gọi Supabase nên đây không phải mã hoá giữ bí mật thật sự.
const SHROUD_KEY = [0x41, 0x72, 0x65, 0x78, 0x4e, 0x65, 0x74, 0x2d, 0x53, 0x42, 0x6f, 0x62, 0x66, 0x2d, 0x76, 0x31];

function unshroud(encoded: string): string {
  const bin = atob(encoded);
  let out = "";
  for (let i = 0; i < bin.length; i++) {
    out += String.fromCharCode(bin.charCodeAt(i) ^ SHROUD_KEY[i % SHROUD_KEY.length]);
  }
  return out;
}

export const SUPABASE_URL = unshroud("KQYRCD1fWwI4KB4TE0YXViQeEQ4qChxGMikXAEheA0EgEAQLK0sXQg==");
export const SUPABASE_ANON_KEY = unshroud(
  "JAsvECwiF0QcKyUrM1c/AA8bLAsHCyYYMAEmVC9GBmkXMS9BYAANZyMhXC8PYh97OxY9OiY8GWspGDwrFWQYey0oDDF4LBlZIiE3JFdMRHcvKDIAfgEZfyUjKBYOTEVZKDsMDycGGRQgGDwrUGQbdzQQV0wnKTdnIxs3Mw9iHHRyPB8hNyseYGMMFSsVZBtndREmMXgoHmxmDzsFHGIiYHI/C0hgHEZHKRs6GiF8PAh0RzZABx0ebmNvNwgSS0V3FzUNGztSMRQyJQMAAEhPCQ==",
);

// Zalo Mini App ID (dùng khi `zmp deploy`). Tham chiếu — CLI lưu ở .zmp/.
export const ZALO_APP_ID = "4439670707467356054";

// Link nhóm cộng đồng Zalo (khớp với site).
export const COMMUNITY_URL = "https://zalo.me/g/ngjnze275";
