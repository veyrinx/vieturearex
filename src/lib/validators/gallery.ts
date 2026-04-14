import { z } from "zod";

export const gallerySchema = z.object({
  id: z.string().optional(),
  image_url: z.string().url(),
  tag: z.string().min(2).max(60),
});

export type GalleryInput = z.infer<typeof gallerySchema>;
