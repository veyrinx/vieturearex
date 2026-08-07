/**
 * Danh sách slash command của bot Arex.
 *
 * Một chỗ duy nhất định nghĩa — `scripts/discord-register-commands.mjs` đọc
 * file này để đẩy lên Discord, và route interactions đọc cùng tên lệnh để
 * điều hướng. Sửa tên ở đây là hai bên tự khớp.
 *
 * Kiểu option của Discord: 1=nhóm lệnh con, 3=chuỗi, 4=số nguyên, 5=đúng/sai.
 */

export const OPTION = {
  SUB_COMMAND: 1,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
} as const;

export const DISCORD_COMMANDS = [
  {
    name: "cho",
    description: "Chợ Arex — tìm tin, xem tin, tra đơn hàng",
    options: [
      {
        type: OPTION.SUB_COMMAND,
        name: "tim",
        description: "Tìm tin đang bán trên chợ",
        options: [
          { type: OPTION.STRING, name: "tu-khoa", description: "Tên acc, skin, nhân vật…", required: false },
          {
            type: OPTION.STRING,
            name: "loai",
            description: "Tài khoản hay vật phẩm",
            required: false,
            choices: [
              { name: "Tài khoản", value: "account" },
              { name: "Vật phẩm", value: "item" },
            ],
          },
          { type: OPTION.INTEGER, name: "gia-toi-da", description: "Giá tối đa (VNĐ)", required: false },
        ],
      },
      {
        type: OPTION.SUB_COMMAND,
        name: "tin",
        description: "Xem chi tiết một tin đăng",
        options: [
          { type: OPTION.STRING, name: "ma", description: "Mã tin (8 ký tự đầu của link)", required: true },
        ],
      },
      {
        type: OPTION.SUB_COMMAND,
        name: "don",
        description: "Tra trạng thái đơn hàng của bạn",
        options: [
          { type: OPTION.STRING, name: "ma", description: "Mã đơn, ví dụ AX-7KQ4P2", required: true },
        ],
      },
    ],
  },
  {
    name: "lienket",
    description: "Nối tài khoản Discord với tài khoản Arex",
    options: [
      { type: OPTION.STRING, name: "ma", description: "Mã 6 ký tự lấy ở arexnetwork.site/profile", required: true },
    ],
  },
  {
    name: "huylienket",
    description: "Gỡ liên kết tài khoản Arex khỏi Discord này",
  },
  {
    name: "toi",
    description: "Xem hồ sơ Arex của bạn: vai trò, gian hàng, đơn đang chạy",
  },
  {
    name: "ticket",
    description: "Mở phòng hỗ trợ riêng với đội ngũ Arex",
  },
  {
    name: "sukien",
    description: "Sự kiện Free Fire đang và sắp diễn ra",
  },
  {
    name: "giveaway",
    description: "Giveaway trong server",
    options: [
      {
        type: OPTION.SUB_COMMAND,
        name: "tao",
        description: "Mở một giveaway mới (chỉ nhân sự Arex)",
        options: [
          { type: OPTION.STRING, name: "giai-thuong", description: "Phần thưởng", required: true },
          { type: OPTION.INTEGER, name: "phut", description: "Kéo dài bao nhiêu phút", required: true },
          { type: OPTION.INTEGER, name: "so-nguoi", description: "Số người trúng (mặc định 1)", required: false },
          {
            type: OPTION.BOOLEAN,
            name: "yeu-cau-lienket",
            description: "Bắt buộc đã liên kết tài khoản Arex mới được tham gia",
            required: false,
          },
        ],
      },
      {
        type: OPTION.SUB_COMMAND,
        name: "ketthuc",
        description: "Chốt sớm một giveaway (chỉ nhân sự Arex)",
        options: [
          { type: OPTION.STRING, name: "ma", description: "Mã giveaway", required: true },
        ],
      },
    ],
  },
  {
    name: "arex",
    description: "Bảng điều khiển Arex: lối tắt tới mọi thứ",
  },
] as const;
