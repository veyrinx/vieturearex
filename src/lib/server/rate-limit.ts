type Bucket = {
  count: number;
  resetAt: number;
};


const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000 * 5; // 5 minutes

export function rateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  },
) {
  const now = Date.now();

  // Thỉnh thoảng dọn dẹp bộ nhớ chống memory leak khi lưu lượng cao
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [k, v] of Array.from(buckets.entries())) {
      if (now > v.resetAt) buckets.delete(k);
    }
    lastCleanup = now;
  }

  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { success: true, remaining: options.limit - 1 };
  }

  if (current.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return { success: true, remaining: options.limit - current.count };
}
