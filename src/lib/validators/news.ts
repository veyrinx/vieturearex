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
  excerpt: z.string().max(280).optional().default(""),
  content: z.string().min(20).max(100000),
  cover: z.string().url(),
  category: z.string().min(2).max(60).optional().default("ESPORTS"),
  created_at: z.string().datetime().optional(),
  status: z.enum(["draft", "published"]).optional().default("published"),
});

export type NewsInput = z.infer<typeof newsSchema>;
