import { z } from "zod";

export const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(6).max(160),
  slug: z
    .string()
    .min(4)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  excerpt: z.string().max(280).default(""),
  content: z
    .string()
    .max(100000)
    .refine((val) => val.replace(/<[^>]*>/g, "").trim().length >= 1, {
      message: "Content must not be empty.",
    }),
  cover: z.string().url(),
  category: z.string().min(2).max(60).default("ESPORTS"),
  created_at: z.string().datetime().optional(),
  status: z.enum(["draft", "published"]).default("published"),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export type NewsInput = z.infer<typeof newsSchema>;
