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
  type Patient,
} from "@/lib/casemix";

const p = (over: Partial<Patient>): Patient => ({ ...emptyPatient("2026-11-01"), id: "x", nama: "A", ...over });

describe("Casemix formulas", () => {
  const sample = p({
    inacbgs: 10_000_000,
    billing: 8_000_000,
    jasaDpjp: 2_000_000, jasaDu: 500_000, jasaPenunjang: 700_000, konsul: 100_000,
    farmasi: 1_800_000, lab: 150_000, radiologi: 100_000, darah: 0, pa: 0, opsLain: 600_000,
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
    const perm = permissions(staff!);
    expect(perm).toMatchObject({ canInput: true, sdm: true, ops: false, billing: false, hapus: false, export: false });
  });

  it("a Viewer can never input or delete, even with boxes ticked", () => {
    const perm = permissions({ ...direksi!, akses: { sdm: true, ops: true, billing: true, hapus: true, export: true } });
    expect(perm).toMatchObject({ canInput: false, sdm: false, ops: false, billing: false, hapus: false, export: true });
  });

  it("admin has every permission and the admin menu", () => {
    expect(permissions(admin!)).toMatchObject({ admin: true, sdm: true, ops: true, billing: true, hapus: true, export: true });
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
    expect(rows[0]).toMatchObject({ tanggal: "2026-11-01", nama: "Budi", rm: "RM1", dpjp: "dr. A", inacbgs: 5_500_000, billing: 5_200_000, darah: 750_000, opsLain: 350_000 });
  });
});
