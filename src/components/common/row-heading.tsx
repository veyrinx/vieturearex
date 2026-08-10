import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Tiêu đề hàng nội dung — gạch nhấn, tên khối, đường kẻ, link "xem tất cả".
 *
 * Trước đây khối markup này được chép nguyên si ở highlight-row, gallery-strip
 * và safety-section; ba bản copy tức là ba chỗ phải nhớ sửa mỗi khi đổi nhịp
 * chữ. Gom về một chỗ để mọi hàng trên trang chủ chắc chắn cùng một khuôn.
 *
 * Hàng tiêu đề phải chịu được màn hẹp: tiêu đề tiếng Việt viết hoa vốn dài,
 * cộng thêm gạch ngăn và link là ba thứ tranh chỗ trên 360px. Nên cho phép
 * xuống dòng, giãn chữ hẹp lại ở mobile, và giấu gạch ngăn cho tới sm — nó chỉ
 * là trang trí, không đáng để ép tiêu đề co lại.
 */

type RowHeadingProps = {
  title: string;
  /** Dòng phụ nhỏ dưới tiêu đề. Bỏ trống thì không vẽ. */
  subtitle?: string;
  /** Link "xem tất cả". Bỏ trống thì không vẽ. */
  href?: string;
  hrefLabel?: string;
};

export function RowHeading({ title, subtitle, href, hrefLabel = "Xem tất cả" }: RowHeadingProps) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="h-px w-5 shrink-0 bg-primary md:w-6" />
        <h2 className="font-heading text-[0.8rem] font-black uppercase tracking-[0.14em] text-foreground md:text-base md:tracking-[0.2em]">
          {title}
        </h2>
        <span className="hidden h-px flex-1 bg-gradient-to-r from-border to-transparent sm:block" />
        {href && (
          <Link
            href={href}
            className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary transition-colors hover:text-primary/80 md:text-[11px]"
          >
            {hrefLabel}
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
      {subtitle && (
        // Thụt vào bằng đúng bề ngang gạch nhấn + khoảng cách để dòng phụ thẳng
        // hàng với chữ tiêu đề chứ không phải với gạch.
        <p className="pl-8 text-[11px] leading-snug text-muted-foreground md:pl-9 md:text-xs">
          {subtitle}
        </p>
      )}
    </div>
  );
}
