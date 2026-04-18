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
  content: z.string().min(20).max(100000),
  cover: z.string().url(),
  category: z.string().min(2).max(60).default("ESPORTS"),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  created_at: z.string().datetime().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

export type NewsInput = z.infer<typeof newsSchema>;
