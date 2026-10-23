import { MapGridSkeleton } from "@/components/craftland/map-card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      <MapGridSkeleton />
    </div>
  );
}
