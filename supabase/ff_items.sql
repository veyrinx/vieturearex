-- ============================================================================
-- Free Fire Items Catalog
-- ============================================================================
-- Stores curated item metadata (labels + categories) shared across admins.
-- Public page /items reads from this table to show friendly names.
-- Sync system stores actual icon files in Supabase Storage bucket "ff-items".

-- ── Storage bucket ──────────────────────────────────────────────────────────
-- Create public bucket for FF item icons (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ff-items', 'ff-items', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access on ff-items bucket
DROP POLICY IF EXISTS "ff_items_public_read" ON storage.objects;
CREATE POLICY "ff_items_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ff-items');

-- Allow authenticated admins to upload/update/delete
DROP POLICY IF EXISTS "ff_items_admin_write" ON storage.objects;
CREATE POLICY "ff_items_admin_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'ff-items'
    AND (auth.jwt() ->> 'role' = 'service_role'
         OR EXISTS (
           SELECT 1 FROM public.users u
           WHERE u.id = auth.uid()
             AND u.role IN ('super_admin', 'admin', 'it', 'manager', 'support')
         ))
  );

-- ── Catalog table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ff_items_catalog (
  id          text PRIMARY KEY,            -- FF item ID (e.g. "211000234")
  label       text,                        -- Friendly name ("AWM Skull Cleaver")
  category    text,                        -- "weapon", "character", "pet", etc.
  is_public   boolean NOT NULL DEFAULT true,
  metadata    jsonb DEFAULT '{}'::jsonb,   -- Future-proof for extra fields
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ff_items_id_format CHECK (id ~ '^[\w.-]{1,80}$'),
  CONSTRAINT ff_items_label_length CHECK (label IS NULL OR length(label) <= 80),
  CONSTRAINT ff_items_category_check CHECK (
    category IS NULL OR category IN (
      'weapon', 'character', 'pet', 'outfit', 'skin',
      'accessory', 'emote', 'vehicle', 'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS ff_items_category_idx ON public.ff_items_catalog (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS ff_items_public_idx ON public.ff_items_catalog (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS ff_items_label_search_idx ON public.ff_items_catalog USING gin (to_tsvector('simple', coalesce(label, '')));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_ff_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ff_items_updated_at ON public.ff_items_catalog;
CREATE TRIGGER ff_items_updated_at
  BEFORE UPDATE ON public.ff_items_catalog
  FOR EACH ROW EXECUTE FUNCTION public.tg_ff_items_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ff_items_catalog ENABLE ROW LEVEL SECURITY;

-- Public can read public items
DROP POLICY IF EXISTS "ff_items_catalog_public_read" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_public_read"
  ON public.ff_items_catalog FOR SELECT
  USING (is_public = true);

-- Admins can read all
DROP POLICY IF EXISTS "ff_items_catalog_admin_read_all" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_admin_read_all"
  ON public.ff_items_catalog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager', 'support')
    )
  );

-- Admins can insert/update/delete
DROP POLICY IF EXISTS "ff_items_catalog_admin_write" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_admin_write"
  ON public.ff_items_catalog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager')
    )
  );

-- ── Helper view (optional) ──────────────────────────────────────────────────
-- Public-friendly view that filters out private items
CREATE OR REPLACE VIEW public.ff_items_public AS
SELECT id, label, category, metadata, created_at, updated_at
FROM public.ff_items_catalog
WHERE is_public = true;

-- Grant select on view
GRANT SELECT ON public.ff_items_public TO anon, authenticated;

COMMENT ON TABLE public.ff_items_catalog IS 'Curated catalog of Free Fire items with admin-set labels and categories';
COMMENT ON COLUMN public.ff_items_catalog.id IS 'FF item ID (matches filename in ff-items storage bucket)';
COMMENT ON COLUMN public.ff_items_catalog.label IS 'Admin-set friendly name';
COMMENT ON COLUMN public.ff_items_catalog.category IS 'Category key for filtering: weapon|character|pet|outfit|skin|accessory|emote|vehicle|other';
COMMENT ON COLUMN public.ff_items_catalog.is_public IS 'Whether this item appears on the public /items page';
