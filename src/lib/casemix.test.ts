import { describe, expect, it } from "vitest";
import {
  DEFAULT_USERS,
  calc,
  emptyPatient,
  opsComponents,
  parseCsv,
  permissions,
  totals,
  usernameToEmail,
  warnings,
  los,
  validatePatient,
  upgradeStats,
  dateRangePreset,
  toCsv,
  upgradeRoute,
  upgradeValidation,
  type Patient,
} from "@/lib/casemix";

const p = (over: Partial<Patient>): Patient => ({
  ...emptyPatient("2026-11-01"),
  id: "x",
  noSep: "SEP1",
  nama: "A",
  ...over,
});

describe("Casemix formulas", () => {
  const sample = p({
    inacbgs: 10_000_000,
    billing: 8_000_000,
    jasaDpjp: 2_000_000,
    jasaDu: 500_000,
    jasaPenunjang: 700_000,
    konsul: 100_000,
    farmasi: 1_800_000,
    lab: 150_000,
    radiologi: 100_000,
    darah: 0,
    pa: 0,
    opsLain: 600_000,
  });
  const c = calc(sample);

  it("allocates SDM 40%, Ops 35%, Investasi 25% of INACBGs", () => {
    expect(c.alokasiSdm).toBe(4_000_000);
    expect(c.alokasiOps).toBe(3_500_000);
    expect(c.investasi).toBe(2_500_000);
  });

  it("Saving = INACBGs - Investasi - SDM - Ops", () => {
    expect(c.sdm).toBe(3_300_000);
    expect(c.ops).toBe(2_650_000);
    expect(c.saving).toBe(10_000_000 - 2_500_000 - 3_300_000 - 2_650_000);
  });

  it("Selisih = INACBGs - Billing and CRR = INACBGs / Billing × 100%", () => {
    expect(c.selisih).toBe(2_000_000);
    expect(c.crr).toBe(125);
  });

  it("Sisa SDM / Ops = alokasi - terpakai", () => {
    expect(c.sisaSdm).toBe(700_000);
    expect(c.sisaOps).toBe(850_000);
  });

  it("CRR is 0 when billing is empty instead of dividing by zero", () => {
    expect(calc(p({ inacbgs: 5_000_000, billing: 0 })).crr).toBe(0);
  });

  it("ops component budgets: Farmasi 20%, Lab 1.75%, Radiologi 1.5%, Ops Lain 7%, Darah 700rb & PA 400rb per patient", () => {
    const t = totals([p({ inacbgs: 10_000_000 }), p({ inacbgs: 10_000_000 })]);
    const by = Object.fromEntries(opsComponents(t).map((x) => [x.key, Math.round(x.alokasi)]));
    expect(by["farmasi"]).toBe(4_000_000);
    expect(by["lab"]).toBe(350_000);
    expect(by["radiologi"]).toBe(300_000);
    expect(by["opsLain"]).toBe(1_400_000);
    expect(by["darah"]).toBe(1_400_000);
    expect(by["pa"]).toBe(800_000);
  });
});

describe("Darah / PA warnings", () => {
  it("warns when Darah is above 700.000", () => {
    expect(warnings({ darah: 700_000, pa: 0 })).toHaveLength(0);
    expect(warnings({ darah: 700_001, pa: 0 })).toHaveLength(1);
  });
  it("warns when PA is above 400.000", () => {
    expect(warnings({ darah: 0, pa: 400_000 })).toHaveLength(0);
    expect(warnings({ darah: 0, pa: 400_001 })).toHaveLength(1);
  });
});

describe("Access rights", () => {
  const [admin, staff, direksi] = DEFAULT_USERS;

  it("staff-sdm can only input SDM", () => {
    const perm = permissions(staff ?? null);
    expect(perm).toMatchObject({
      canInput: true,
      sdm: true,
      ops: false,
      billing: false,
      hapus: false,
      export: false,
    });
  });

  it("a Viewer can never input or delete, even with boxes ticked", () => {
    if (!direksi) throw new Error("Missing viewer fixture");
    const perm = permissions({
      ...direksi,
      akses: { sdm: true, ops: true, billing: true, hapus: true, export: true },
    });
    expect(perm).toMatchObject({
      canInput: false,
      sdm: false,
      ops: false,
      billing: false,
      hapus: false,
      export: true,
    });
  });

  it("admin has every permission and the admin menu", () => {
    expect(permissions(admin ?? null)).toMatchObject({
      admin: true,
      sdm: true,
      ops: true,
      billing: true,
      hapus: true,
      export: true,
    });
  });

  it("starting accounts use the requested usernames and passwords", () => {
    expect(DEFAULT_USERS.map((u) => [u.user, u.pass, u.role])).toEqual([
      ["admin", "admin123", "Admin"],
      ["staff-sdm", "sdm123", "Inputer"],
      ["direksi", "lihat123", "Viewer"],
    ]);
  });

  it("usernames map case-insensitively to one login address", () => {
    expect(usernameToEmail(" Staff-SDM ")).toBe(usernameToEmail("staff-sdm"));
  });
});

describe("CSV import", () => {
  it("reads the documented column order", () => {
    const csv =
      "Tanggal,Nama,NoRM,DPJP,INACBGs,BillingRS,JasaDPJP,JasaDU,JasaPenunjang,Konsul,Farmasi,Lab,Radiologi,Darah,PA,OpsLain\n" +
      "2026-11-01,Budi,RM1,dr. A,5500000,5200000,900000,250000,300000,50000,1000000,90000,80000,750000,0,350000";
    const { rows, errors } = parseCsv(csv, () => "id");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      tanggal: "2026-11-01",
      nama: "Budi",
      rm: "RM1",
      dpjp: "dr. A",
      inacbgs: 5_500_000,
      billing: 5_200_000,
      darah: 750_000,
      opsLain: 350_000,
    });
  });
});

const up = (over: Partial<Patient> = {}) =>
  p({
    jenisNaikKelas: "Biasa",
    kelasAwal: "Kelas 2",
    kelasTujuan: "Kelas 1",
    tambahanNaikKelas: 500_000,
    inacbgs: 10_000_000,
    billing: 8_000_000,
    ...over,
  });
describe("Inpatient and upgrade rules", () => {
  it("requires SEP", () => expect(validatePatient(p({ noSep: "" }))).not.toBeNull());
  it("allows repeated RM for distinct SEP", () => {
    const rows = [p({ rm: "RM1", noSep: "SEP1" }), p({ rm: "RM1", noSep: "SEP2" })];
    const result = parseCsv(toCsv(rows, false), () => "");
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });
  it("rejects duplicate SEP in import", () => {
    const result = parseCsv(toCsv([p({ noSep: "SEP1" }), p({ noSep: "sep1" })], false), () => "");
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });
  it("LOS includes admission and discharge days", () =>
    expect(los(p({ tanggal: "2026-11-01", tanggalPulang: "2026-11-03" }))).toBe(3));
  it("LOS is absent without discharge", () => expect(los(p({}))).toBeNull());
  it("rejects discharge before admission", () =>
    expect(validatePatient(p({ tanggalPulang: "2026-10-31" }))).not.toBeNull());
  it("Biasa rejects equal or lower class", () => {
    expect(validatePatient(up({ kelasTujuan: "Kelas 2" }))).not.toBeNull();
    expect(validatePatient(up({ kelasTujuan: "Kelas 3" }))).not.toBeNull();
    expect(validatePatient(up({ kelasTujuan: "VIP" }))).toBeNull();
  });
  it("COB permits same class and includes it in routes, payer income and exports", () => {
    const sample = up({
      jenisNaikKelas: "COB",
      kelasAwal: "Kelas 2",
      kelasTujuan: "Kelas 2",
      penjaminId: "payer",
      namaPenjaminCob: "Allianz",
    });
    expect(validatePatient(sample)).toBeNull();
    expect(upgradeValidation(sample)).toBeNull();
    expect(upgradeRoute(sample)).toBe("Kelas 2 -> Kelas 2 (COB - Tetap Kelas)");
    const stats = upgradeStats([sample]);
    expect(stats.cob).toBe(1);
    expect(stats.incomeCob).toBe(500000);
    expect(stats.routes[0]?.name).toBe("Kelas 2 -> Kelas 2 (COB - Tetap Kelas)");
    expect(stats.payers[0]?.value).toBe(500000);
    expect(parseCsv(toCsv([sample]), () => "").errors).toEqual([]);
  });
  it("COB rejects a lower class", () => {
    const sample = up({
      jenisNaikKelas: "COB",
      kelasAwal: "Kelas 1",
      kelasTujuan: "Kelas 2",
      penjaminId: "payer",
    });
    expect(validatePatient(sample)).toBe(
      "Kelas Tujuan COB tidak boleh lebih rendah dari Kelas Awal",
    );
    expect(upgradeValidation(sample)).toBe(
      "Kelas Tujuan COB tidak boleh lebih rendah dari Kelas Awal",
    );
  });
  it("COB requires a selected payer", () =>
    expect(validatePatient(up({ jenisNaikKelas: "COB", penjaminId: "" }))).toBe(
      "Pilih Penjamin COB dulu",
    ));
  it("upgrades require positive extra cost", () => {
    expect(validatePatient(up({ tambahanNaikKelas: 0 }))).not.toBeNull();
    expect(validatePatient(up({ tambahanNaikKelas: -1 }))).not.toBeNull();
  });
  it("total revenue includes upgrade cost", () =>
    expect(calc(up()).totalPendapatan).toBe(10_500_000));
  it("investment remains 25% of INACBGs alone", () => expect(calc(up()).investasi).toBe(2_500_000));
  it("saving deducts investment, staff and operations from revenue", () =>
    expect(calc(up({ jasaDpjp: 1_000_000, farmasi: 2_000_000 })).saving).toBe(5_000_000));
  it("difference uses total revenue", () => expect(calc(up()).selisih).toBe(2_500_000));
  it("CRR uses total revenue divided by billing", () => expect(calc(up()).crr).toBe(131.25));
  it("aggregates upgrade revenue into main totals", () =>
    expect(totals([up(), up()]).totalPendapatan).toBe(21_000_000));
  it("exports and reads all new fields including multiple ICD codes", () => {
    const sample = up({
      icd10: "A09,J18.9",
      tanggalPulang: "2026-11-03",
      keteranganNaikKelas: "Pilihan keluarga",
    });
    const result = parseCsv(toCsv([sample]), () => "");
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      noSep: "SEP1",
      icd10: "A09,J18.9",
      tanggalPulang: "2026-11-03",
      tambahanNaikKelas: 500000,
      keteranganNaikKelas: "Pilihan keluarga",
    });
  });
  it("counts only upgraded patients and separates payer income", () => {
    const s = upgradeStats([
      p({}),
      up(),
      up({
        jenisNaikKelas: "COB",
        penjaminId: "p",
        namaPenjaminCob: "Allianz",
        tambahanNaikKelas: 750000,
      }),
    ]);
    expect(s.biasa).toBe(1);
    expect(s.cob).toBe(1);
    expect(s.income).toBe(1250000);
    expect(s.payers[0]).toMatchObject({
      name: "Allianz",
      count: 1,
      value: 750000,
      average: 750000,
    });
  });
  it("last seven days includes today", () =>
    expect(dateRangePreset("7 Hari Terakhir", "2026-11-20")).toEqual({
      from: "2026-11-14",
      to: "2026-11-20",
    }));
  it("last month handles year boundary", () =>
    expect(dateRangePreset("Bulan Lalu", "2026-01-20")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    }));
});

import { timeRange, inRange, matchesSearchBy, emptyPatient as ep2 } from "./casemix";
describe("filter rentang waktu", () => {
  const today = "2026-11-20"; // Jumat
  it("Hari Ini dan Kemarin satu tanggal", () => {
    expect(timeRange("hari", today)).toMatchObject({ from: today, to: today, label: "Jumat, 20 Nov 2026" });
    expect(timeRange("kemarin", today)).toMatchObject({ from: "2026-11-19", to: "2026-11-19" });
  });
  it("Minggu Ini Senin - Minggu", () => {
    expect(timeRange("minggu", today)).toMatchObject({ from: "2026-11-16", to: "2026-11-22", label: "16 - 22 Nov 2026" });
  });
  it("Bulan dan Tahun bisa digeser", () => {
    expect(timeRange("bulan", today, -1)).toMatchObject({ from: "2026-10-01", to: "2026-10-31", label: "Oktober 2026" });
    expect(timeRange("tahun", today, 1)).toMatchObject({ from: "2027-01-01", to: "2027-12-31" });
  });
  it("Rentang Kustom terbalik ditolak", () => {
    expect(timeRange("kustom", today, 0, { from: "2026-11-20", to: "2026-11-01" }).error).toBe(
      "Tanggal Selesai tidak boleh sebelum Tanggal Mulai",
    );
    expect(timeRange("kustom", today, 0, { from: "2026-11-01", to: "2026-11-20" }).days).toBe(20);
  });
  it("inRange dan Semua Waktu", () => {
    const p = ep2("2026-11-05");
    expect(inRange(p, timeRange("bulan", today))).toBe(true);
    expect(inRange(p, timeRange("hari", today))).toBe(false);
    expect(inRange(p, timeRange("semua", today))).toBe(true);
  });
  it("cari berdasarkan kolom", () => {
    const p = { ...ep2("2026-11-05"), nama: "Budi", rm: "123" };
    expect(matchesSearchBy(p, "budi", "nama")).toBe(true);
    expect(matchesSearchBy(p, "budi", "rm")).toBe(false);
  });
});
