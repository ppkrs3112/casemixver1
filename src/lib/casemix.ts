// Pure Casemix business logic: allocations, formulas, aggregation, insights, CSV.

export const ALOKASI = {
  sdm: 0.4,
  ops: 0.35,
  investasi: 0.25,
  farmasi: 0.2,
  lab: 0.0175,
  radiologi: 0.015,
  opsLain: 0.07,
} as const;

export const MAX_DARAH = 700_000;
export const MAX_PA = 400_000;

export interface Patient {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nama: string;
  rm: string;
  dpjp: string;
  inacbgs: number;
  billing: number;
  jasaDpjp: number;
  jasaDu: number;
  jasaPenunjang: number;
  konsul: number;
  farmasi: number;
  lab: number;
  radiologi: number;
  darah: number;
  pa: number;
  opsLain: number;
}

export type Role = "Admin" | "Inputer" | "Viewer";

export interface Akses {
  sdm: boolean;
  ops: boolean;
  billing: boolean;
  hapus: boolean;
  export: boolean;
}

export interface UserAccount {
  user: string;
  pass: string;
  role: Role;
  nama: string;
  akses: Akses;
}

export const DEFAULT_USERS: UserAccount[] = [
  {
    user: "admin",
    pass: "admin123",
    role: "Admin",
    nama: "Admin Utama",
    akses: { sdm: true, ops: true, billing: true, hapus: true, export: true },
  },
  {
    user: "staff-sdm",
    pass: "sdm123",
    role: "Inputer",
    nama: "Staff SDM",
    akses: { sdm: true, ops: false, billing: false, hapus: false, export: false },
  },
  {
    user: "direksi",
    pass: "lihat123",
    role: "Viewer",
    nama: "Direksi",
    akses: { sdm: false, ops: false, billing: false, hapus: false, export: true },
  },
];

/** Usernames are the login handle; auth needs an email, so each maps to a fixed internal address. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const normalizeUsername = (u: string) => u.trim().toLowerCase();
export const usernameToEmail = (u: string) => `${normalizeUsername(u)}@casemix.local`;

export function presetAkses(role: Role): Akses {
  if (role === "Admin") return { sdm: true, ops: true, billing: true, hapus: true, export: true };
  if (role === "Viewer") return { sdm: false, ops: false, billing: false, hapus: false, export: true };
  return { sdm: true, ops: true, billing: true, hapus: false, export: true };
}

/** Effective permissions: a Viewer can never input, edit or delete, whatever the checkboxes say. */
export function permissions(u: UserAccount | null) {
  if (!u) {
    return { canInput: false, sdm: false, ops: false, billing: false, hapus: false, export: false, admin: false };
  }
  const viewer = u.role === "Viewer";
  return {
    canInput: !viewer,
    sdm: !viewer && u.akses.sdm,
    ops: !viewer && u.akses.ops,
    billing: !viewer && u.akses.billing,
    hapus: !viewer && u.akses.hapus,
    export: u.akses.export,
    admin: u.role === "Admin",
  };
}

export interface Calc {
  alokasiSdm: number;
  alokasiOps: number;
  investasi: number;
  sdm: number;
  ops: number;
  saving: number;
  selisih: number;
  crr: number;
  sisaSdm: number;
  sisaOps: number;
}

export function calc(p: Pick<Patient, keyof Patient> | Patient): Calc {
  const alokasiSdm = p.inacbgs * ALOKASI.sdm;
  const alokasiOps = p.inacbgs * ALOKASI.ops;
  const investasi = p.inacbgs * ALOKASI.investasi;
  const sdm = p.jasaDpjp + p.jasaDu + p.jasaPenunjang + p.konsul;
  const ops = p.farmasi + p.lab + p.radiologi + p.darah + p.pa + p.opsLain;
  return {
    alokasiSdm,
    alokasiOps,
    investasi,
    sdm,
    ops,
    saving: p.inacbgs - investasi - sdm - ops,
    selisih: p.inacbgs - p.billing,
    crr: crrOf(p.inacbgs, p.billing),
    sisaSdm: alokasiSdm - sdm,
    sisaOps: alokasiOps - ops,
  };
}

export function crrOf(inacbgs: number, billing: number) {
  return billing > 0 ? (inacbgs / billing) * 100 : 0;
}

export function warnings(p: Pick<Patient, "darah" | "pa">): string[] {
  const w: string[] = [];
  if (p.darah > MAX_DARAH) w.push(`Darah melebihi batas ${formatRp(MAX_DARAH)} (lebih ${formatRp(p.darah - MAX_DARAH)})`);
  if (p.pa > MAX_PA) w.push(`PA melebihi batas ${formatRp(MAX_PA)} (lebih ${formatRp(p.pa - MAX_PA)})`);
  return w;
}

export const formatRp = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
export const formatPct = (n: number) => (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
export const formatShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
  if (a >= 1e6) return (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (a >= 1e3) return (n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " rb";
  return String(Math.round(n));
};

// ---------- Aggregation ----------

export interface Totals extends Calc {
  count: number;
  inacbgs: number;
  billing: number;
  jasaDpjp: number;
  jasaDu: number;
  jasaPenunjang: number;
  konsul: number;
  farmasi: number;
  lab: number;
  radiologi: number;
  darah: number;
  pa: number;
  opsLain: number;
}

const SUM_KEYS = [
  "inacbgs", "billing", "jasaDpjp", "jasaDu", "jasaPenunjang", "konsul",
  "farmasi", "lab", "radiologi", "darah", "pa", "opsLain",
] as const;

export function totals(list: Patient[]): Totals {
  const t = Object.fromEntries(SUM_KEYS.map((k) => [k, 0])) as Record<(typeof SUM_KEYS)[number], number>;
  for (const p of list) for (const k of SUM_KEYS) t[k] += p[k] || 0;
  const c = calc({ ...t, id: "", tanggal: "", nama: "", rm: "", dpjp: "" });
  return { ...t, ...c, count: list.length };
}

export type Mode = "harian" | "bulanan" | "tahunan";

export interface PeriodFilter {
  mode: Mode;
  tanggal: string; // YYYY-MM-DD
  bulan: string; // YYYY-MM
  tahun: string; // YYYY or "" (all)
}

export function inPeriod(p: Patient, f: PeriodFilter) {
  if (f.mode === "harian") return !f.tanggal || p.tanggal === f.tanggal;
  if (f.mode === "bulanan") return !f.bulan || p.tanggal.startsWith(f.bulan);
  return !f.tahun || p.tanggal.startsWith(f.tahun);
}

export function matchesSearch(p: Patient, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${p.nama} ${p.rm} ${p.dpjp}`.toLowerCase().includes(s);
}

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function periodLabel(f: PeriodFilter) {
  if (f.mode === "harian") {
    if (!f.tanggal) return "Semua tanggal";
    const [y, m, d] = f.tanggal.split("-");
    return `${Number(d)} ${BULAN_PANJANG[Number(m) - 1]} ${y}`;
  }
  if (f.mode === "bulanan") {
    if (!f.bulan) return "Semua bulan";
    const [y, m] = f.bulan.split("-");
    return `${BULAN_PANJANG[Number(m) - 1]} ${y}`;
  }
  return f.tahun ? `Tahun ${f.tahun}` : "Semua tahun";
}

export interface TrendPoint {
  key: string;
  label: string;
  inacbgs: number;
  billing: number;
  saving: number;
  count: number;
}

/**
 * Trend series for Grafik 1. Harian: each day of the selected date's month.
 * Bulanan: each month of the selected month's year. Tahunan: every year in the data.
 */
export function trend(list: Patient[], f: PeriodFilter): TrendPoint[] {
  const groups = new Map<string, Patient[]>();
  let keys: string[] = [];
  if (f.mode === "harian") {
    const ym = (f.tanggal || list.map((p) => p.tanggal).sort().at(-1) || "").slice(0, 7);
    if (ym) {
      const y = Number(ym.slice(0, 4));
      const m = Number(ym.slice(5, 7));
      const days = new Date(y, m, 0).getDate();
      keys = Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
    }
    for (const p of list) if (p.tanggal.startsWith(ym)) push(groups, p.tanggal, p);
  } else if (f.mode === "bulanan") {
    const y = (f.bulan || list.map((p) => p.tanggal).sort().at(-1) || "").slice(0, 4);
    if (y) keys = BULAN.map((_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
    for (const p of list) if (p.tanggal.startsWith(y)) push(groups, p.tanggal.slice(0, 7), p);
  } else {
    for (const p of list) push(groups, p.tanggal.slice(0, 4), p);
    keys = [...groups.keys()].sort();
  }
  return keys.map((key) => {
    const t = totals(groups.get(key) ?? []);
    let label = key;
    if (f.mode === "harian") label = String(Number(key.slice(8)));
    if (f.mode === "bulanan") label = BULAN[Number(key.slice(5)) - 1] ?? key;
    return { key, label, inacbgs: t.inacbgs, billing: t.billing, saving: t.saving, count: t.count };
  });
}

function push(m: Map<string, Patient[]>, k: string, p: Patient) {
  const a = m.get(k);
  if (a) a.push(p);
  else m.set(k, [p]);
}

export interface OpsComponent {
  key: "farmasi" | "lab" | "radiologi" | "darah" | "pa" | "opsLain";
  label: string;
  alokasi: number;
  terpakai: number;
}

/** Per-component ops budget. Darah and PA budgets are their per-patient caps × patient count. */
export function opsComponents(t: Totals): OpsComponent[] {
  return [
    { key: "farmasi", label: "Farmasi", alokasi: t.inacbgs * ALOKASI.farmasi, terpakai: t.farmasi },
    { key: "lab", label: "Lab", alokasi: t.inacbgs * ALOKASI.lab, terpakai: t.lab },
    { key: "radiologi", label: "Radiologi", alokasi: t.inacbgs * ALOKASI.radiologi, terpakai: t.radiologi },
    { key: "darah", label: "Darah", alokasi: MAX_DARAH * t.count, terpakai: t.darah },
    { key: "pa", label: "PA", alokasi: MAX_PA * t.count, terpakai: t.pa },
    { key: "opsLain", label: "Ops Lainnya", alokasi: t.inacbgs * ALOKASI.opsLain, terpakai: t.opsLain },
  ];
}

export interface DpjpRow {
  dpjp: string;
  crr: number;
  inacbgs: number;
  billing: number;
  count: number;
}

export function crrPerDpjp(list: Patient[]): DpjpRow[] {
  const g = new Map<string, Patient[]>();
  for (const p of list) push(g, p.dpjp.trim() || "(Tanpa DPJP)", p);
  return [...g.entries()]
    .map(([dpjp, ps]) => {
      const t = totals(ps);
      return { dpjp, crr: crrOf(t.inacbgs, t.billing), inacbgs: t.inacbgs, billing: t.billing, count: t.count };
    })
    .sort((a, b) => b.crr - a.crr);
}

// ---------- Insights ----------

export function insightTrend(points: TrendPoint[], t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  const out: string[] = [];
  out.push(
    t.selisih >= 0
      ? `INACBGs lebih besar dari Billing sebesar ${formatRp(t.selisih)} (CRR ${formatPct(t.crr)}).`
      : `Billing melebihi INACBGs sebesar ${formatRp(-t.selisih)} (CRR ${formatPct(t.crr)}) — RS merugi.`,
  );
  const withData = points.filter((p) => p.count > 0);
  if (withData.length > 1) {
    const best = withData.reduce((a, b) => (b.saving > a.saving ? b : a));
    const worst = withData.reduce((a, b) => (b.saving < a.saving ? b : a));
    out.push(`Saving tertinggi di ${best.label} (${formatRp(best.saving)}), terendah di ${worst.label} (${formatRp(worst.saving)}).`);
  }
  return out;
}

export function insightAlokasi(t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  return [
    t.sisaSdm < 0
      ? `SDM over budget ${formatRp(-t.sisaSdm)}.`
      : `SDM masih sisa ${formatRp(t.sisaSdm)} dari alokasi 40%.`,
    t.sisaOps < 0
      ? `Operasional over budget ${formatRp(-t.sisaOps)}.`
      : `Operasional masih sisa ${formatRp(t.sisaOps)} dari alokasi 35%.`,
  ];
}

export function insightSdm(t: Totals): string[] {
  if (t.count === 0 || t.sdm === 0) return ["Belum ada pemakaian SDM pada periode ini."];
  const parts = [
    ["Jasa DPJP", t.jasaDpjp],
    ["Dokter Umum", t.jasaDu],
    ["Penunjang", t.jasaPenunjang],
    ["Konsul Telp", t.konsul],
  ] as const;
  const top = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return [`Komponen SDM terbesar: ${top[0]} ${formatRp(top[1])} (${formatPct((top[1] / t.sdm) * 100)} dari SDM terpakai).`];
}

export function insightOps(comps: OpsComponent[], t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  const over = comps.filter((c) => c.terpakai > c.alokasi);
  if (over.length === 0) return ["Semua komponen operasional masih dalam alokasi."];
  return over.map((c) => `${c.label} over budget ${formatRp(c.terpakai - c.alokasi)}.`);
}

export function insightOpsPie(t: Totals): string[] {
  if (t.ops === 0) return ["Belum ada pemakaian operasional pada periode ini."];
  const parts = [
    ["Farmasi", t.farmasi], ["Lab", t.lab], ["Radiologi", t.radiologi],
    ["Darah", t.darah], ["PA", t.pa], ["Ops Lainnya", t.opsLain],
  ] as const;
  const top = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return [`Komponen operasional terbesar: ${top[0]} ${formatRp(top[1])} (${formatPct((top[1] / t.ops) * 100)}).`];
}

export function insightInvest(t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  const out = [
    t.saving >= 0 ? `Saving positif ${formatRp(t.saving)} setelah investasi 25%.` : `Saving minus ${formatRp(-t.saving)} — biaya melebihi porsi INACBGs.`,
  ];
  if (t.selisih < 0) out.push(`Selisih minus ${formatRp(-t.selisih)}: billing lebih besar dari klaim INACBGs.`);
  return out;
}

export function insightDpjp(rows: DpjpRow[]): string[] {
  if (rows.length === 0) return ["Belum ada data DPJP pada periode ini."];
  const rugi = rows.filter((r) => r.billing > 0 && r.crr < 100);
  if (rugi.length === 0) return ["Semua DPJP memiliki CRR ≥ 100%."];
  return [`${rugi.length} DPJP dengan CRR < 100%: ${rugi.slice(-3).map((r) => `${r.dpjp} (${formatPct(r.crr)})`).join(", ")}.`];
}

// ---------- CSV ----------

export const CSV_HEADER =
  "Tanggal,Nama,NoRM,DPJP,INACBGs,BillingRS,JasaDPJP,JasaDU,JasaPenunjang,Konsul,Farmasi,Lab,Radiologi,Darah,PA,OpsLain";

const CSV_FIELDS: (keyof Patient)[] = [
  "tanggal", "nama", "rm", "dpjp", "inacbgs", "billing", "jasaDpjp", "jasaDu",
  "jasaPenunjang", "konsul", "farmasi", "lab", "radiologi", "darah", "pa", "opsLain",
];

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(s: string) {
  const clean = (s || "").replace(/[^\d,.-]/g, "");
  // Accept "1500000", "1.500.000" (id-ID) and "1500000.50"
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) return Number(clean.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(clean.replace(",", ".")) || 0;
}

function normalizeDate(s: string) {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${(m[2] ?? "").padStart(2, "0")}-${(m[1] ?? "").padStart(2, "0")}`;
  return t;
}

export function parseCsv(text: string, makeId: () => string): { rows: Patient[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], errors: ["File kosong."] };
  const first = lines[0] ?? "";
  const sep = first.includes(";") && !first.includes(",") ? ";" : ",";
  const start = /tanggal/i.test(first) ? 1 : 0;
  const rows: Patient[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i] ?? "", sep);
    if (cols.length < 6) { errors.push(`Baris ${i + 1}: kolom kurang.`); continue; }
    const p = { id: makeId() } as Patient;
    CSV_FIELDS.forEach((f, idx) => {
      const v = cols[idx] ?? "";
      if (f === "tanggal") p.tanggal = normalizeDate(v);
      else if (f === "nama" || f === "rm" || f === "dpjp") p[f] = v;
      else (p as unknown as Record<string, number>)[f] = toNumber(v);
    });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal)) { errors.push(`Baris ${i + 1}: tanggal tidak valid.`); continue; }
    if (!p.nama) { errors.push(`Baris ${i + 1}: nama kosong.`); continue; }
    rows.push(p);
  }
  return { rows, errors };
}

const esc = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(list: Patient[], withCalc = true): string {
  const head = withCalc
    ? CSV_HEADER + ",AlokasiSDM,SDMTerpakai,SisaSDM,AlokasiOps,OpsTerpakai,SisaOps,Investasi,Selisih,CRR,Saving"
    : CSV_HEADER;
  const lines = list.map((p) => {
    const base = CSV_FIELDS.map((f) => esc(p[f]));
    if (!withCalc) return base.join(",");
    const c = calc(p);
    return [
      ...base,
      Math.round(c.alokasiSdm), Math.round(c.sdm), Math.round(c.sisaSdm),
      Math.round(c.alokasiOps), Math.round(c.ops), Math.round(c.sisaOps),
      Math.round(c.investasi), Math.round(c.selisih), c.crr.toFixed(2), Math.round(c.saving),
    ].join(",");
  });
  return [head, ...lines].join("\n");
}

export const CSV_TEMPLATE =
  CSV_HEADER +
  "\n2026-11-01,Budi Santoso,RM001234,dr. Andi Sp.PD,5500000,5200000,900000,250000,300000,50000,1000000,90000,80000,0,0,350000\n";

export function emptyPatient(tanggal: string): Patient {
  return {
    id: "", tanggal, nama: "", rm: "", dpjp: "", inacbgs: 0, billing: 0,
    jasaDpjp: 0, jasaDu: 0, jasaPenunjang: 0, konsul: 0,
    farmasi: 0, lab: 0, radiologi: 0, darah: 0, pa: 0, opsLain: 0,
  };
}
