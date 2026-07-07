// Nguồn dữ liệu: dùng lại API công khai + đã bật CORS của site Arex.
// LƯU Ý: phải khai báo domain này trong Zalo Mini App Developer Console
// (mục "Domain cho phép") — xem README.
export const API_BASE = "https://arexnetwork.site";

export const SITE_URL = "https://arexnetwork.site";

// Supabase (khoá công khai — an toàn để nhúng client). Trùng với site để dùng
// chung tài khoản: đăng nhập trên mini app = đăng nhập trên web.
export const SUPABASE_URL = "https://ukelbkocjktbpjiogogl.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_y5DLZjRUQv9Lm1Hdvli9DA_bHFKArV2";

// Zalo Mini App ID (dùng khi `zmp deploy`). Tham chiếu — CLI lưu ở .zmp/.
export const ZALO_APP_ID = "4439670707467356054";

// Link nhóm cộng đồng Zalo (khớp với site).
export const COMMUNITY_URL = "https://zalo.me/g/ngjnze275";
