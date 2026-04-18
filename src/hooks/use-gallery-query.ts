"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GalleryItem } from "@/lib/types/content";

export const GALLERY_ADMIN_KEY = ["admin-gallery"] as const;

async function fetchAdminGallery() {
  const response = await fetch("/api/admin/gallery", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load gallery.");
  const data = (await response.json()) as { gallery: GalleryItem[] };
  return data.gallery;
}

export function useGalleryQuery() {
  return useQuery({
    queryKey: GALLERY_ADMIN_KEY,
    queryFn: fetchAdminGallery,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useInvalidateGallery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GALLERY_ADMIN_KEY });
}
