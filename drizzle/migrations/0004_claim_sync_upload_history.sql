CREATE TABLE public.claim_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind integer NOT NULL CHECK (kind BETWEEN 1 AND 4),
 filename text NOT NULL,
 rows jsonb NOT NULL CHECK (jsonb_typeof(rows) = 'array'),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revoked_at timestamptz,
 revoked_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.claim_uploads TO authenticated;
GRANT ALL ON public.claim_uploads TO service_role;
ALTER TABLE public.claim_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads claim uploads" ON public.claim_uploads FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Permitted team uploads claims" ON public.claim_uploads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_team_member(auth.uid()) AND ((kind IN (1,2,3) AND public.has_perm(auth.uid(),'billing')) OR (kind = 4 AND public.has_perm(auth.uid(),'sdm') AND public.has_perm(auth.uid(),'ops'))));
CREATE POLICY "Permitted team revokes uploads" ON public.claim_uploads FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid()) AND public.has_perm(auth.uid(),'hapus')) WITH CHECK (public.is_team_member(auth.uid()) AND public.has_perm(auth.uid(),'hapus'));
CREATE FUNCTION public.guard_claim_upload() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.revoked_at IS NOT NULL OR NEW.revoked_by IS NOT NULL OR jsonb_array_length(NEW.rows) = 0 OR jsonb_array_length(NEW.rows) > 5000 THEN RAISE EXCEPTION 'Upload tidak valid'; END IF;
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.filename IS DISTINCT FROM OLD.filename OR NEW.rows IS DISTINCT FROM OLD.rows OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Riwayat upload tidak boleh diubah'; END IF;
  IF EXISTS (SELECT 1 FROM public.claim_uploads WHERE revoked_at IS NULL AND (created_at,id) > (OLD.created_at,OLD.id)) THEN RAISE EXCEPTION 'Hanya upload terakhir yang dapat dibatalkan'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_claim_upload BEFORE INSERT OR UPDATE ON public.claim_uploads FOR EACH ROW EXECUTE FUNCTION public.guard_claim_upload();
CREATE INDEX claim_uploads_order ON public.claim_uploads(created_at,id);