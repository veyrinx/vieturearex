"use client";

import { useQuery } from "@tanstack/react-query";
import type { GalleryItem } from "@/lib/types/content";

async function fetchGallery() {
  const response = await fetch("/api/gallery", {
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error("Unable to load gallery.");
  }
  const data = (await response.json()) as { gallery: GalleryItem[] };
  return data.gallery;
}

export function useGalleryQuery() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
  });
}
