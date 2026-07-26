import "server-only";

/** Ngày dạng YYYY-MM-DD theo giờ VN (ICT), lùi `daysAgo` ngày. */
export function vnDateKey(daysAgo = 0) {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 7);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Giờ hiện tại (0–23) theo giờ VN. */
export function vnHourNow(): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false,
  }).format(new Date());
  const n = parseInt(s);
  return n === 24 ? 0 : n;
}

/** Thứ trong tuần (0 = CN) theo giờ VN. */
export function vnWeekdayNow(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })).getDay();
}
