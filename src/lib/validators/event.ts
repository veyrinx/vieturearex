import { z } from "zod";

const eventDateInput = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ])
  .optional()
  .refine((value) => typeof value === "string" && value.trim().length > 0, {
    message: "Vui lòng chọn ngày hợp lệ.",
  })
  .transform((value) => {
    if (!value) {
      return "";
    }

    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(`${trimmed}T00:00:00+07:00`);
      if (Number.isNaN(date.getTime())) {
        throw new Error("Invalid date input: malformed date");
      }
      return date.toISOString();
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date input: malformed date");
    }
    return parsed.toISOString();
  });

export const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(4).max(120),
  description: z.string().max(3000).optional().default(""),
  start_date: eventDateInput,
  end_date: eventDateInput,
  image_url: z.string().url(),
  thumbnail_url: z.union([z.string().url(), z.literal(""), z.null()]).optional().default(""),
  link: z.union([z.string().url(), z.literal(""), z.null()]).optional().default(""),
  status: z.enum(["active", "upcoming", "expired"]).optional(),
});

export type EventInput = z.infer<typeof eventSchema>;
