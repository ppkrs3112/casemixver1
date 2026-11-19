CREATE TABLE public.appearance_settings (id text PRIMARY KEY DEFAULT 'global', settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.appearance_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.appearance_settings TO authenticated;
GRANT ALL ON public.appearance_settings TO service_role;
ALTER TABLE public.appearance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads display settings" ON public.appearance_settings FOR SELECT TO anon, authenticated USING (id='global');
CREATE POLICY "Admin inserts display settings" ON public.appearance_settings FOR INSERT TO authenticated WITH CHECK (id='global' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates display settings" ON public.appearance_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (id='global' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin uploads hospital logo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='hospital-branding' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin reads hospital logo" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='hospital-branding' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin deletes hospital logo" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='hospital-branding' AND public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.validate_inpatient_upgrade() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ranks text[] := ARRAY['Kelas 3','Kelas 2','Kelas 1','VIP','VVIP']; payer public.cob_payers;
BEGIN
IF NEW.tanggal_masuk IS NULL THEN NEW.tanggal_masuk := NEW.tanggal; END IF;
IF TG_OP='UPDATE' AND NEW.tanggal IS DISTINCT FROM OLD.tanggal AND NEW.tanggal_masuk IS NOT DISTINCT FROM OLD.tanggal_masuk THEN NEW.tanggal_masuk := NEW.tanggal; END IF;
NEW.tanggal := NEW.tanggal_masuk;
IF TG_OP='INSERT' OR NEW.no_sep IS DISTINCT FROM OLD.no_sep THEN
IF nullif(btrim(NEW.no_sep),'') IS NULL THEN RAISE EXCEPTION 'No SEP wajib diisi'; END IF;
END IF;
NEW.no_sep := nullif(btrim(NEW.no_sep),'');
IF NEW.tanggal_pulang < NEW.tanggal_masuk THEN RAISE EXCEPTION 'Tanggal pulang tidak boleh sebelum tanggal masuk'; END IF;
IF array_position(ranks,NEW.kelas_awal) IS NULL THEN RAISE EXCEPTION 'Kelas awal tidak valid'; END IF;
IF NEW.jenis_naik_kelas NOT IN ('Tidak','Biasa','COB') THEN RAISE EXCEPTION 'Jenis naik kelas tidak valid'; END IF;
IF NEW.jenis_naik_kelas='Tidak' THEN NEW.tambahan_naik_kelas:=0; NEW.kelas_tujuan:=''; NEW.penjamin_id:=NULL; NEW.nama_penjamin_cob:='';
ELSE
IF array_position(ranks,NEW.kelas_tujuan) IS NULL THEN RAISE EXCEPTION 'Pilih Kelas Tujuan'; END IF;
IF NEW.jenis_naik_kelas='Biasa' AND array_position(ranks,NEW.kelas_tujuan)<=array_position(ranks,NEW.kelas_awal) THEN RAISE EXCEPTION 'Kelas Tujuan harus lebih tinggi dari Kelas Awal'; END IF;
IF NEW.jenis_naik_kelas='COB' AND array_position(ranks,NEW.kelas_tujuan)<array_position(ranks,NEW.kelas_awal) THEN RAISE EXCEPTION 'Kelas Tujuan COB tidak boleh lebih rendah dari Kelas Awal'; END IF;
IF NEW.tambahan_naik_kelas<=0 THEN RAISE EXCEPTION 'Tambahan biaya wajib lebih dari 0'; END IF;
IF NEW.jenis_naik_kelas='COB' THEN
IF NEW.penjamin_id IS NULL THEN RAISE EXCEPTION 'Pilih Penjamin COB dulu'; END IF;
SELECT * INTO payer FROM public.cob_payers WHERE id=NEW.penjamin_id;
IF payer.id IS NULL THEN RAISE EXCEPTION 'Penjamin COB tidak ditemukan'; END IF;
IF NOT payer.aktif AND (TG_OP='INSERT' OR NEW.penjamin_id IS DISTINCT FROM OLD.penjamin_id OR OLD.jenis_naik_kelas<>'COB') THEN RAISE EXCEPTION 'Penjamin COB tidak aktif'; END IF;
NEW.nama_penjamin_cob:=payer.nama;
ELSE NEW.penjamin_id:=NULL; NEW.nama_penjamin_cob:='Bayar Sendiri'; END IF;
END IF;
RETURN NEW;
END $$;