# Arex — Zalo Mini App

Zalo Mini App (ZMP) cho cộng đồng Free Fire Arex. Project **độc lập** với site
Next.js, dùng lại API công khai của `arexnetwork.site` để hiển thị Tin tức, Sự
kiện và Giải đấu ngay trong ứng dụng Zalo.

## Công nghệ

- [zmp-ui](https://mini.zalo.me) — bộ **UI + icon chính chủ** của Zalo Mini App
  (`App`, `Page`, `Header`, `BottomNavigation`, `Icon icon="zi-*"`, `Avatar`…)
- [zmp-sdk](https://mini.zalo.me) — SDK Zalo Mini App (user info, openWebview…)
- React 18, routing qua `ZMPRouter`/`AnimationRoutes` của zmp-ui
- Vite + `zmp-vite-plugin`

## Cấu trúc

```
zalo-miniapp/
├── app-config.json        # Cấu hình Mini App (title, header, status bar…)
├── vite.config.mts
├── src/
│   ├── index.html
│   ├── main.tsx           # entry (import zmp-ui/zaui.css)
│   ├── app.tsx            # App + ZMPRouter + BottomNavigation
│   ├── config.ts          # API_BASE, SITE_URL
│   ├── api.ts             # gọi API công khai của site
│   ├── types.ts
│   ├── hooks/             # useUser (zmp-sdk), useAsync
│   ├── components/        # navbar (BottomNavigation), row, states
│   ├── pages/             # home, news, events, tournaments
│   └── css/app.css
```

## Chạy dev

```bash
cd zalo-miniapp
npm install
npm i -g zmp-cli      # nếu chưa có
zmp start             # mở Zalo Mini App Studio (giả lập)
```

## Deploy lên Zalo

1. Tạo Mini App ở [Zalo Mini App Developer](https://mini.zalo.me) → lấy **App ID**.
2. `zmp login` rồi `zmp deploy` (chọn App ID tương ứng).
3. Trong Developer Console, mục **Cấu hình → Domain cho phép**, thêm:
   `https://arexnetwork.site` (nếu không request sẽ bị chặn).

## Lưu ý CORS

Mini app fetch dữ liệu từ `arexnetwork.site`. Các endpoint sau đã được bật
`Access-Control-Allow-Origin: *` ở phía site:

- `GET /api/news?content=0`
- `GET /api/events?status=all`
- `GET /api/tms/tournaments`
- `GET /api/leaderboard`

Nếu thêm màn hình mới cần API khác, nhớ bật CORS cho endpoint đó.
