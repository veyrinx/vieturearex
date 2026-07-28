/** Khối gradient "AX" — dùng ở splash, màn đăng nhập và icon app. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-2xl bg-linear-to-br from-violet-glow to-cyan-glow font-black text-ink-950"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      AX
    </div>
  );
}
