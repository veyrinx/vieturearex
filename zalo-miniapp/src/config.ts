// Nguồn dữ liệu: dùng lại API công khai + đã bật CORS của site Arex.
// LƯU Ý: phải khai báo domain này trong Zalo Mini App Developer Console
// (mục "Domain cho phép") — xem README.
// Bắt buộc là tên miền phục vụ trực tiếp: tên miền cũ trả 308, mà request kèm
// header (Authorization) dính chuyển hướng thì CORS gãy trong WebView Zalo.
export const API_BASE = "https://www.arexnetwork.vn";

export const SITE_URL = "https://www.arexnetwork.vn";

// Supabase (khoá công khai — an toàn để nhúng client). Trùng với site để dùng
// chung tài khoản: đăng nhập trên mini app = đăng nhập trên web.
export const SUPABASE_URL = "https://kjqqukageltvdohkakxb.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcXF1a2FnZWx0dmRvaGtha3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjM0NzIsImV4cCI6MjA5MTgzOTQ3Mn0.y2jzYUxGQJ955S8IxjC0-Xjtf3FVGhcu7E9aglbfe98";

// Zalo Mini App ID (dùng khi `zmp deploy`). Tham chiếu — CLI lưu ở .zmp/.
export const ZALO_APP_ID = "4439670707467356054";

// Link nhóm cộng đồng Zalo (khớp với site).
export const COMMUNITY_URL = "https://zalo.me/g/ngjnze275";
