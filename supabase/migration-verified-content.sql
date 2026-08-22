-- ============================================================
-- Arex Network — Verified Content Technical Specification Migration
-- Implementation of Verification Lifecycle, Immutable Verified Content,
-- Append-Only Audit Trail, and Soft Delete protection.
-- ============================================================

-- 1. Contents Table (Main Content Storage)
CREATE TABLE IF NOT EXISTS public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL DEFAULT '',
  content_body TEXT NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contents_status ON public.contents(verification_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contents_user ON public.contents(user_id);
CREATE INDEX IF NOT EXISTS idx_contents_created ON public.contents(created_at DESC);

-- 2. Content Verifications Table (Verification Details)
CREATE TABLE IF NOT EXISTS public.content_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL UNIQUE REFERENCES public.contents(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  verification_note TEXT, -- Sensitive internal note: MUST NEVER be exposed in public API responses!
  verification_source TEXT,
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of content_body at verification time
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_verifications_content ON public.content_verifications(content_id);
CREATE INDEX IF NOT EXISTS idx_content_verifications_expires ON public.content_verifications(verification_expires_at);

-- 3. Content Audit Logs Table (Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS public.content_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL,
  action VARCHAR(30) NOT NULL
    CHECK (action IN ('CREATE', 'UPDATE', 'SUBMIT_VERIFY', 'VERIFY', 'REJECT', 'EXPIRE', 'SOFT_DELETE')),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_content ON public.content_audit_logs(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.content_audit_logs(actor_id);

-- 4. DB Rule / Trigger: Append-Only protection for content_audit_logs
CREATE OR REPLACE FUNCTION public.prevent_content_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'content_audit_logs is an Append-Only table. UPDATE and DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_logs_mod ON public.content_audit_logs;
CREATE TRIGGER trg_prevent_audit_logs_mod
  BEFORE UPDATE OR DELETE ON public.content_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_content_audit_logs_modification();

-- 5. DB Rule / Trigger: Hard Delete Prevention on contents (Soft Delete Only)
CREATE OR REPLACE FUNCTION public.prevent_content_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard DELETE is prohibited on contents table. Use Soft Delete (is_deleted = true) instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_content_hard_delete ON public.contents;
CREATE TRIGGER trg_prevent_content_hard_delete
  BEFORE DELETE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_content_hard_delete();

-- 6. DB Rule / Trigger: Immutable Content Guard on contents table
-- When verification_status = VERIFIED, content_body and title cannot be edited directly without demoting to UNVERIFIED.
CREATE OR REPLACE FUNCTION public.guard_verified_content_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.verification_status = 'VERIFIED' AND NEW.verification_status = 'VERIFIED' THEN
    IF OLD.content_body <> NEW.content_body OR OLD.title <> NEW.title THEN
      RAISE EXCEPTION 'Verified content is immutable. Direct modification is prohibited. Reset verification status to UNVERIFIED first.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_verified_content_immutability ON public.contents;
CREATE TRIGGER trg_guard_verified_content_immutability
  BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.guard_verified_content_immutability();

-- 7. Enable RLS and setup security policies
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_audit_logs ENABLE ROW LEVEL SECURITY;

-- Contents policies
DROP POLICY IF EXISTS "Public can view non-deleted contents" ON public.contents;
CREATE POLICY "Public can view non-deleted contents" ON public.contents
  FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Users can insert contents" ON public.contents;
CREATE POLICY "Users can insert contents" ON public.contents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners or Admins update contents" ON public.contents;
CREATE POLICY "Owners or Admins update contents" ON public.contents
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_editor());

-- Content verifications policies
DROP POLICY IF EXISTS "Public view verifications" ON public.content_verifications;
CREATE POLICY "Public view verifications" ON public.content_verifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage verifications" ON public.content_verifications;
CREATE POLICY "Admins manage verifications" ON public.content_verifications
  FOR ALL USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

-- Audit logs policies
DROP POLICY IF EXISTS "Admins or owners view audit logs" ON public.content_audit_logs;
CREATE POLICY "Admins or owners view audit logs" ON public.content_audit_logs
  FOR SELECT USING (public.is_admin_or_editor() OR actor_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.content_audit_logs;
CREATE POLICY "Anyone can insert audit logs" ON public.content_audit_logs
  FOR INSERT WITH CHECK (true);
