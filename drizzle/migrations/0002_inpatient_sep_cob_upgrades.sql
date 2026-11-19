CREATE TABLE public.cob_payers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nama text NOT NULL, jenis text NOT NULL DEFAULT 'Asuransi Swasta', kontak text NOT NULL DEFAULT '', aktif boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cob_payers TO authenticated;
GRANT ALL ON public.cob_payers TO service_role;
ALTER TABLE public.cob_payers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads COB payers" ON public.cob_payers FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins create COB payers" ON public.cob_payers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update COB payers" ON public.cob_payers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete COB payers" ON public.cob_payers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.patients ADD COLUMN no_sep text, ADD COLUMN tanggal_masuk date, ADD COLUMN tanggal_pulang date, ADD COLUMN icd10 text NOT NULL DEFAULT '', ADD COLUMN kelas_awal text NOT NULL DEFAULT 'Kelas 3', ADD COLUMN kelas_tujuan text NOT NULL DEFAULT '', ADD COLUMN jenis_naik_kelas text NOT NULL DEFAULT 'Tidak', ADD COLUMN penjamin_id uuid REFERENCES public.cob_payers(id) ON DELETE RESTRICT, ADD COLUMN nama_penjamin_cob text NOT NULL DEFAULT '', ADD COLUMN tambahan_naik_kelas numeric NOT NULL DEFAULT 0, ADD COLUMN keterangan_naik_kelas text NOT NULL DEFAULT '';
UPDATE public.patients SET tanggal_masuk = tanggal;
CREATE UNIQUE INDEX patients_no_sep_unique ON public.patients (lower(btrim(no_sep))) WHERE no_sep IS NOT NULL;
COMMENT ON COLUMN public.patients.tanggal IS 'DEPRECATED: replaced by tanggal_masuk; synchronized for compatibility with previously published app';
CREATE FUNCTION public.validate_inpatient_upgrade() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ranks text[] := ARRAY['Kelas 3','Kelas 2','Kelas 1','VIP','VVIP']; payer public.cob_payers;
BEGIN
IF NEW.tanggal_masuk IS NULL THEN NEW.tanggal_masuk := NEW.tanggal; END IF;
IF TG_OP = 'UPDATE' AND NEW.tanggal IS DISTINCT FROM OLD.tanggal AND NEW.tanggal_masuk IS NOT DISTINCT FROM OLD.tanggal_masuk THEN NEW.tanggal_masuk := NEW.tanggal; END IF;
NEW.tanggal := NEW.tanggal_masuk;
IF TG_OP = 'INSERT' OR NEW.no_sep IS DISTINCT FROM OLD.no_sep THEN
IF nullif(btrim(NEW.no_sep),'') IS NULL THEN RAISE EXCEPTION 'No SEP wajib diisi'; END IF;
END IF;
NEW.no_sep := nullif(btrim(NEW.no_sep),'');
IF NEW.tanggal_pulang < NEW.tanggal_masuk THEN RAISE EXCEPTION 'Tanggal pulang tidak boleh sebelum tanggal masuk'; END IF;
IF array_position(ranks,NEW.kelas_awal) IS NULL THEN RAISE EXCEPTION 'Kelas awal tidak valid'; END IF;
IF NEW.jenis_naik_kelas NOT IN ('Tidak','Biasa','COB') THEN RAISE EXCEPTION 'Jenis naik kelas tidak valid'; END IF;
IF NEW.jenis_naik_kelas = 'Tidak' THEN NEW.tambahan_naik_kelas := 0; NEW.kelas_tujuan := ''; NEW.penjamin_id := NULL; NEW.nama_penjamin_cob := '';
ELSE
IF array_position(ranks,NEW.kelas_tujuan) IS NULL OR array_position(ranks,NEW.kelas_tujuan) <= array_position(ranks,NEW.kelas_awal) THEN RAISE EXCEPTION 'Kelas tujuan harus lebih tinggi dari kelas awal'; END IF;
IF NEW.tambahan_naik_kelas <= 0 THEN RAISE EXCEPTION 'Tambahan biaya wajib lebih dari 0'; END IF;
IF NEW.jenis_naik_kelas = 'COB' THEN
IF NEW.penjamin_id IS NULL THEN RAISE EXCEPTION 'Pilih Penjamin COB dulu'; END IF;
SELECT * INTO payer FROM public.cob_payers WHERE id=NEW.penjamin_id;
IF payer.id IS NULL THEN RAISE EXCEPTION 'Penjamin COB tidak ditemukan'; END IF;
IF NOT payer.aktif AND (TG_OP='INSERT' OR NEW.penjamin_id IS DISTINCT FROM OLD.penjamin_id OR OLD.jenis_naik_kelas <> 'COB') THEN RAISE EXCEPTION 'Penjamin COB tidak aktif'; END IF;
NEW.nama_penjamin_cob := payer.nama;
ELSE NEW.penjamin_id := NULL; NEW.nama_penjamin_cob := 'Bayar Sendiri'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_inpatient_upgrade BEFORE INSERT OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.validate_inpatient_upgrade();