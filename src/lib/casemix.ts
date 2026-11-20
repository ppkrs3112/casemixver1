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
  tanggal: string; // admission YYYY-MM-DD
  noSep: string;
  tanggalPulang: string;
  icd10: string;
  kelasAwal: string;
  kelasTujuan: string;
  jenisNaikKelas: "Tidak" | "Biasa" | "COB";
  penjaminId: string;
  namaPenjaminCob: string;
  tambahanNaikKelas: number;
  keteranganNaikKelas: string;
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
  if (role === "Viewer")
    return { sdm: false, ops: false, billing: false, hapus: false, export: true };
  return { sdm: true, ops: true, billing: true, hapus: false, export: true };
}

/** Effective permissions: a Viewer can never input, edit or delete, whatever the checkboxes say. */
export function permissions(u: UserAccount | null) {
  if (!u) {
    return {
      canInput: false,
      sdm: false,
      ops: false,
      billing: false,
      hapus: false,
      export: false,
      admin: false,
    };
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
  totalPendapatan: number;
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
  const totalPendapatan = p.inacbgs + (p.tambahanNaikKelas || 0);
  return {
    totalPendapatan,
    alokasiSdm,
    alokasiOps,
    investasi,
    sdm,
    ops,
    saving: totalPendapatan - investasi - sdm - ops,
    selisih: totalPendapatan - p.billing,
    crr: crrOf(totalPendapatan, p.billing),
    sisaSdm: alokasiSdm - sdm,
    sisaOps: alokasiOps - ops,
  };
}

export function crrOf(inacbgs: number, billing: number) {
  return billing > 0 ? (inacbgs / billing) * 100 : 0;
}

export function warnings(p: Pick<Patient, "darah" | "pa">): string[] {
  const w: string[] = [];
  if (p.darah > MAX_DARAH)
    w.push(`Darah melebihi batas ${formatRp(MAX_DARAH)} (lebih ${formatRp(p.darah - MAX_DARAH)})`);
  if (p.pa > MAX_PA)
    w.push(`PA melebihi batas ${formatRp(MAX_PA)} (lebih ${formatRp(p.pa - MAX_PA)})`);
  return w;
}

export const formatRp = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
export const formatPct = (n: number) =>
  (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
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
  "tambahanNaikKelas",
  "inacbgs",
  "billing",
  "jasaDpjp",
  "jasaDu",
  "jasaPenunjang",
  "konsul",
  "farmasi",
  "lab",
  "radiologi",
  "darah",
  "pa",
  "opsLain",
] as const;

export function totals(list: Patient[]): Totals {
  const t = Object.fromEntries(SUM_KEYS.map((k) => [k, 0])) as Record<
    (typeof SUM_KEYS)[number],
    number
  >;
  for (const p of list) for (const k of SUM_KEYS) t[k] += p[k] || 0;
  const c = calc({ ...emptyPatient(""), ...t });
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
  return `${p.noSep} ${p.nama} ${p.rm} ${p.dpjp} ${p.icd10}`.toLowerCase().includes(s);
}

export const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
export const BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
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
  totalPendapatan: number;
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
    const ym = (
      f.tanggal ||
      list
        .map((p) => p.tanggal)
        .sort()
        .at(-1) ||
      ""
    ).slice(0, 7);
    if (ym) {
      const y = Number(ym.slice(0, 4));
      const m = Number(ym.slice(5, 7));
      const days = new Date(y, m, 0).getDate();
      keys = Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
    }
    for (const p of list) if (p.tanggal.startsWith(ym)) push(groups, p.tanggal, p);
  } else if (f.mode === "bulanan") {
    const y = (
      f.bulan ||
      list
        .map((p) => p.tanggal)
        .sort()
        .at(-1) ||
      ""
    ).slice(0, 4);
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
    return {
      key,
      label,
      inacbgs: t.inacbgs,
      billing: t.billing,
      saving: t.saving,
      totalPendapatan: t.totalPendapatan,
      count: t.count,
    };
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
    {
      key: "radiologi",
      label: "Radiologi",
      alokasi: t.inacbgs * ALOKASI.radiologi,
      terpakai: t.radiologi,
    },
    { key: "darah", label: "Darah", alokasi: MAX_DARAH * t.count, terpakai: t.darah },
    { key: "pa", label: "PA", alokasi: MAX_PA * t.count, terpakai: t.pa },
    {
      key: "opsLain",
      label: "Ops Lainnya",
      alokasi: t.inacbgs * ALOKASI.opsLain,
      terpakai: t.opsLain,
    },
  ];
}

export interface DpjpRow {
  dpjp: string;
  crr: number;
  inacbgs: number;
  billing: number;
  count: number;
  totalPendapatan: number;
  selisih: number;
}

export function crrPerDpjp(list: Patient[]): DpjpRow[] {
  const g = new Map<string, Patient[]>();
  for (const p of list) push(g, p.dpjp.trim() || "(Tanpa DPJP)", p);
  return [...g.entries()]
    .map(([dpjp, ps]) => {
      const t = totals(ps);
      return {
        dpjp,
        crr: t.crr,
        totalPendapatan: t.totalPendapatan,
        selisih: t.selisih,
        inacbgs: t.inacbgs,
        billing: t.billing,
        count: t.count,
      };
    })
    .sort((a, b) => b.crr - a.crr);
}

// ---------- Insights ----------

export function insightTrend(points: TrendPoint[], t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  const out: string[] = [];
  out.push(
    t.selisih >= 0
      ? `Total pendapatan lebih besar dari Billing sebesar ${formatRp(t.selisih)} (CRR ${formatPct(t.crr)}).`
      : `Billing melebihi total pendapatan sebesar ${formatRp(-t.selisih)} (CRR ${formatPct(t.crr)}) — RS merugi.`,
  );
  const withData = points.filter((p) => p.count > 0);
  if (withData.length > 1) {
    const best = withData.reduce((a, b) => (b.saving > a.saving ? b : a));
    const worst = withData.reduce((a, b) => (b.saving < a.saving ? b : a));
    out.push(
      `Saving tertinggi di ${best.label} (${formatRp(best.saving)}), terendah di ${worst.label} (${formatRp(worst.saving)}).`,
    );
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
  return [
    `Komponen SDM terbesar: ${top[0]} ${formatRp(top[1])} (${formatPct((top[1] / t.sdm) * 100)} dari SDM terpakai).`,
  ];
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
    ["Farmasi", t.farmasi],
    ["Lab", t.lab],
    ["Radiologi", t.radiologi],
    ["Darah", t.darah],
    ["PA", t.pa],
    ["Ops Lainnya", t.opsLain],
  ] as const;
  const top = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return [
    `Komponen operasional terbesar: ${top[0]} ${formatRp(top[1])} (${formatPct((top[1] / t.ops) * 100)}).`,
  ];
}

export function insightInvest(t: Totals): string[] {
  if (t.count === 0) return ["Belum ada data pada periode ini."];
  const out = [
    t.saving >= 0
      ? `Saving positif ${formatRp(t.saving)} setelah investasi 25%.`
      : `Saving minus ${formatRp(-t.saving)} — biaya melebihi total pendapatan.`,
  ];
  if (t.selisih < 0)
    out.push(`Selisih minus ${formatRp(-t.selisih)}: billing lebih besar dari total pendapatan.`);
  return out;
}

export function insightDpjp(rows: DpjpRow[]): string[] {
  if (rows.length === 0) return ["Belum ada data DPJP pada periode ini."];
  const rugi = rows.filter((r) => r.billing > 0 && r.crr < 100);
  if (rugi.length === 0) return ["Semua DPJP memiliki CRR ≥ 100%."];
  return [
    `${rugi.length} DPJP dengan CRR < 100%: ${rugi
      .slice(-3)
      .map((r) => `${r.dpjp} (${formatPct(r.crr)})`)
      .join(", ")}.`,
  ];
}

// ---------- CSV ----------

export const CSV_HEADER =
  "NoSEP,TanggalMasuk,TanggalPulang,Nama,NoRM,ICD10,DPJP,KelasAwal,KelasTujuan,RuteNaikKelas,JenisNaikKelas,NamaPenjaminCOB,TambahanNaikKelas,KeteranganNaikKelas,INACBGs,Billing,JasaDPJP,JasaDU,JasaPenunjang,Konsul,Farmasi,Lab,Radiologi,Darah,PA,OpsLain";
export const CSV_FIELDS = [
  "noSep",
  "tanggal",
  "tanggalPulang",
  "nama",
  "rm",
  "icd10",
  "dpjp",
  "kelasAwal",
  "kelasTujuan",
  "rute",
  "jenisNaikKelas",
  "namaPenjaminCob",
  "tambahanNaikKelas",
  "keteranganNaikKelas",
  "inacbgs",
  "billing",
  "jasaDpjp",
  "jasaDu",
  "jasaPenunjang",
  "konsul",
  "farmasi",
  "lab",
  "radiologi",
  "darah",
  "pa",
  "opsLain",
] as const;
const LEGACY_FIELDS = [
  "tanggal",
  "nama",
  "rm",
  "dpjp",
  "inacbgs",
  "billing",
  "jasaDpjp",
  "jasaDu",
  "jasaPenunjang",
  "konsul",
  "farmasi",
  "lab",
  "radiologi",
  "darah",
  "pa",
  "opsLain",
] as const;

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(s: string) {
  const clean = (s || "").replace(/[^\d,.-]/g, "");
  // Accept "1500000", "1.500.000" (id-ID) and "1500000.50"
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean))
    return Number(clean.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(clean.replace(",", ".")) || 0;
}

function normalizeDate(s: string) {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${(m[2] ?? "").padStart(2, "0")}-${(m[1] ?? "").padStart(2, "0")}`;
  return t;
}

export function parseCsv(
  text: string,
  makeId: () => string,
): { rows: Patient[]; errors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { rows: [], errors: ["File kosong."] };
  const first = lines[0] ?? "";
  const sep =
    first.startsWith("NoSEP;") || (first.includes(";") && !first.includes(",")) ? ";" : ",";
  const modern = /^NoSEP/i.test(first);
  const start = /tanggal|nosep/i.test(first) ? 1 : 0;
  const rows: Patient[] = [];
  const seen = new Set<string>();
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i] ?? "", sep);
    const p = { ...emptyPatient(""), id: makeId() };
    const fields = modern ? CSV_FIELDS : LEGACY_FIELDS;
    fields.forEach((f, idx) => {
      const v = cols[idx] ?? "";
      if (f === "rute") return;
      if (f === "tanggal" || f === "tanggalPulang") p[f] = normalizeDate(v);
      else if (f === "jenisNaikKelas")
        p[f] = /COB/i.test(v) ? "COB" : /Biasa/i.test(v) ? "Biasa" : "Tidak";
      else if (typeof p[f] === "number") (p as unknown as Record<string, unknown>)[f] = toNumber(v);
      else (p as unknown as Record<string, unknown>)[f] = v;
    });
    // Legacy files remain readable; saving requires the missing SEP to be supplied.
    const error = modern
      ? validatePatient(p, false)
      : !p.tanggal || !p.nama
        ? "Tanggal dan nama wajib diisi"
        : null;
    if (error) {
      errors.push(`Baris ${i + 1}: ${error}`);
      continue;
    }
    const key = p.noSep.toLowerCase();
    if (key && seen.has(key)) {
      errors.push(`Baris ${i + 1}: No SEP duplikat`);
      continue;
    }
    if (key) seen.add(key);
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
    ? CSV_HEADER +
      ",LOS,TotalPendapatan,AlokasiSDM,SDMTerpakai,SisaSDM,AlokasiOps,OpsTerpakai,SisaOps,Investasi,Selisih,CRR,Saving"
    : CSV_HEADER;
  const lines = list.map((p) => {
    const base = CSV_FIELDS.map((f) => esc(f === "rute" ? upgradeRoute(p) : p[f]));
    if (!withCalc) return base.join(",");
    const c = calc(p);
    return [
      ...base,
      los(p) ?? "-",
      Math.round(c.totalPendapatan),
      Math.round(c.alokasiSdm),
      Math.round(c.sdm),
      Math.round(c.sisaSdm),
      Math.round(c.alokasiOps),
      Math.round(c.ops),
      Math.round(c.sisaOps),
      Math.round(c.investasi),
      Math.round(c.selisih),
      c.crr.toFixed(2),
      Math.round(c.saving),
    ].join(",");
  });
  return [head, ...lines].join("\n");
}

export const CSV_TEMPLATE =
  CSV_HEADER +
  '\nSEP000123,2026-11-01,2026-11-03,Budi Santoso,RM001234,"A09,J18.9",dr. Andi Sp.PD,Kelas 2,Kelas 1,Kelas 2 -> Kelas 1,Biasa,Bayar Sendiri,500000,,5500000,5200000,900000,250000,300000,50000,1000000,90000,80000,0,0,350000\n';

export function emptyPatient(tanggal: string): Patient {
  return {
    noSep: "",
    tanggalPulang: "",
    icd10: "",
    kelasAwal: "Kelas 3",
    kelasTujuan: "",
    jenisNaikKelas: "Tidak",
    penjaminId: "",
    namaPenjaminCob: "",
    tambahanNaikKelas: 0,
    keteranganNaikKelas: "",
    id: "",
    tanggal,
    nama: "",
    rm: "",
    dpjp: "",
    inacbgs: 0,
    billing: 0,
    jasaDpjp: 0,
    jasaDu: 0,
    jasaPenunjang: 0,
    konsul: 0,
    farmasi: 0,
    lab: 0,
    radiologi: 0,
    darah: 0,
    pa: 0,
    opsLain: 0,
  };
}

export const CLASSES = ["Kelas 3", "Kelas 2", "Kelas 1", "VIP", "VVIP"];
export function los(p: Pick<Patient, "tanggal" | "tanggalPulang">): number | null {
  if (!p.tanggalPulang) return null;
  return Math.round((Date.parse(p.tanggalPulang) - Date.parse(p.tanggal)) / 86400000) + 1;
}
export function upgradeRoute(p: Patient) {
  return p.jenisNaikKelas === "Tidak"
    ? "-"
    : `${p.kelasAwal} -> ${p.kelasTujuan}${p.jenisNaikKelas === "COB" && p.kelasAwal === p.kelasTujuan ? " (COB - Tetap Kelas)" : ""}`;
}
export function upgradeValidation(p: Patient): string | null {
  if (p.jenisNaikKelas === "Tidak") return null;
  const from = CLASSES.indexOf(p.kelasAwal),
    to = CLASSES.indexOf(p.kelasTujuan);
  if (to < 0 || from < 0) return "Pilih Kelas Awal dan Kelas Tujuan";
  if (p.jenisNaikKelas === "Biasa" && to <= from)
    return "Kelas Tujuan harus lebih tinggi dari Kelas Awal";
  if (p.jenisNaikKelas === "COB" && to < from)
    return "Kelas Tujuan COB tidak boleh lebih rendah dari Kelas Awal";
  if (p.jenisNaikKelas === "COB" && !p.penjaminId) return "Pilih Penjamin COB dulu";
  if (!Number.isFinite(p.tambahanNaikKelas) || p.tambahanNaikKelas <= 0)
    return "Tambahan biaya wajib lebih dari 0";
  return null;
}
export function validatePatient(p: Patient, requirePayer = true): string | null {
  if (!p.noSep.trim()) return "No SEP wajib diisi";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal) || !Number.isFinite(Date.parse(p.tanggal)))
    return "Tanggal masuk tidak valid";
  if (
    p.tanggalPulang &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggalPulang) || !Number.isFinite(Date.parse(p.tanggalPulang)))
  )
    return "Tanggal pulang tidak valid";
  if (p.tanggalPulang && p.tanggalPulang < p.tanggal)
    return "Tanggal pulang tidak boleh sebelum tanggal masuk";
  if (!p.nama.trim()) return "Nama pasien wajib diisi";
  if (!CLASSES.includes(p.kelasAwal)) return "Kelas awal tidak valid";
  if (!["Tidak", "Biasa", "COB"].includes(p.jenisNaikKelas)) return "Jenis naik kelas tidak valid";
  if (p.jenisNaikKelas !== "Tidak") {
    if (!CLASSES.includes(p.kelasTujuan)) return "Pilih Kelas Awal dan Kelas Tujuan";
    if (
      p.jenisNaikKelas === "Biasa" &&
      CLASSES.indexOf(p.kelasTujuan) <= CLASSES.indexOf(p.kelasAwal)
    )
      return "Kelas Tujuan harus lebih tinggi dari Kelas Awal";
    if (p.jenisNaikKelas === "COB" && CLASSES.indexOf(p.kelasTujuan) < CLASSES.indexOf(p.kelasAwal))
      return "Kelas Tujuan COB tidak boleh lebih rendah dari Kelas Awal";
    if (!Number.isFinite(p.tambahanNaikKelas) || p.tambahanNaikKelas <= 0)
      return "Tambahan biaya wajib lebih dari 0";
    if (p.jenisNaikKelas === "COB" && !(requirePayer ? p.penjaminId : p.namaPenjaminCob))
      return "Pilih Penjamin COB dulu";
  }
  return null;
}
export function upgradeStats(rows: Patient[]) {
  const upgraded = rows.filter((p) => p.jenisNaikKelas !== "Tidak");
  const biasa = upgraded.filter((p) => p.jenisNaikKelas === "Biasa");
  const cob = upgraded.filter((p) => p.jenisNaikKelas === "COB");
  const income = (ps: Patient[]) => ps.reduce((s, p) => s + p.tambahanNaikKelas, 0);
  const groups = (ps: Patient[], key: (p: Patient) => string) => {
    const g = new Map<string, Patient[]>();
    for (const p of ps) push(g, key(p), p);
    return [...g]
      .map(([name, list]) => ({
        name,
        count: list.length,
        value: income(list),
        average: income(list) / list.length,
      }))
      .sort((a, b) => b.value - a.value);
  };
  const dates = [...new Set(upgraded.map((p) => p.tanggal))].sort();
  return {
    upgraded,
    biasa: biasa.length,
    cob: cob.length,
    incomeBiasa: income(biasa),
    incomeCob: income(cob),
    income: income(upgraded),
    routes: groups(upgraded, upgradeRoute),
    payers: groups(cob, (p) => p.namaPenjaminCob),
    mix: [
      { name: "Biasa", count: biasa.length, value: income(biasa) },
      { name: "COB", count: cob.length, value: income(cob) },
    ],
    trend: dates.map((date) => ({
      date,
      biasa: income(biasa.filter((p) => p.tanggal === date)),
      cob: income(cob.filter((p) => p.tanggal === date)),
      countBiasa: biasa.filter((p) => p.tanggal === date).length,
      countCob: cob.filter((p) => p.tanggal === date).length,
    })),
  };
}
export function dateRangePreset(preset: string, today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (preset === "Hari Ini") return { from: today, to: today };
  if (preset === "7 Hari Terakhir") {
    d.setUTCDate(d.getUTCDate() - 6);
    return { from: iso(d), to: today };
  }
  if (preset === "Bulan Ini") return { from: today.slice(0, 7) + "-01", to: today };
  if (preset === "Bulan Lalu") {
    d.setUTCDate(0);
    const to = iso(d);
    d.setUTCDate(1);
    return { from: iso(d), to };
  }
  return { from: "", to: "" };
}

// ---- Filter Rentang Waktu (Hari – Tahun) ----
export type TimeKind = "hari" | "kemarin" | "minggu" | "bulan" | "tahun" | "kustom" | "semua";
export const TIME_KINDS: { value: TimeKind; label: string }[] = [
  { value: "hari", label: "Hari Ini" },
  { value: "kemarin", label: "Kemarin" },
  { value: "minggu", label: "Minggu Ini" },
  { value: "bulan", label: "Bulan Ini" },
  { value: "tahun", label: "Tahun Ini" },
  { value: "kustom", label: "Rentang Kustom" },
  { value: "semua", label: "Semua Waktu" },
];
export interface TimeRange {
  from: string;
  to: string;
  label: string;
  days: number | null;
  error?: string;
}
const BULAN_PANJANG_TR = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const isoOf = (x: Date) => x.toISOString().slice(0, 10);
const dOf = (s: string) => new Date(`${s}T00:00:00Z`);
export function shortDate(s: string) {
  const d = dOf(s);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function spanDays(from: string, to: string) {
  return Math.round((dOf(to).getTime() - dOf(from).getTime()) / 86400000) + 1;
}
function rangeLabel(from: string, to: string) {
  const a = dOf(from), b = dOf(to);
  if (from === to) return `${HARI[a.getUTCDay()]}, ${shortDate(from)}`;
  if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth())
    return `${a.getUTCDate()} - ${shortDate(to)}`;
  return `${shortDate(from)} - ${shortDate(to)}`;
}
/** offset menggeser bulan/tahun (tombol << >>). */
export function timeRange(kind: TimeKind, today: string, offset = 0, custom = { from: "", to: "" }): TimeRange {
  const t = dOf(today);
  if (kind === "semua") return { from: "", to: "", label: "Semua Waktu", days: null };
  if (kind === "hari" || kind === "kemarin") {
    if (kind === "kemarin") t.setUTCDate(t.getUTCDate() - 1);
    const s = isoOf(t);
    return { from: s, to: s, label: rangeLabel(s, s), days: 1 };
  }
  if (kind === "minggu") {
    const dow = (t.getUTCDay() + 6) % 7; // Senin = 0
    t.setUTCDate(t.getUTCDate() - dow);
    const from = isoOf(t);
    t.setUTCDate(t.getUTCDate() + 6);
    const to = isoOf(t);
    return { from, to, label: rangeLabel(from, to), days: 7 };
  }
  if (kind === "bulan") {
    const s = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + offset, 1));
    const e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0));
    const from = isoOf(s), to = isoOf(e);
    return { from, to, label: `${BULAN_PANJANG_TR[s.getUTCMonth()]} ${s.getUTCFullYear()}`, days: spanDays(from, to) };
  }
  if (kind === "tahun") {
    const y = t.getUTCFullYear() + offset;
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun ${y}`, days: spanDays(`${y}-01-01`, `${y}-12-31`) };
  }
  const { from, to } = custom;
  if (!from || !to) return { from: "", to: "", label: "Pilih tanggal mulai & selesai", days: null, error: "Tanggal Mulai dan Selesai wajib diisi" };
  if (to < from) return { from, to, label: "Rentang tidak valid", days: null, error: "Tanggal Selesai tidak boleh sebelum Tanggal Mulai" };
  return { from, to, label: rangeLabel(from, to), days: spanDays(from, to) };
}
export function inRange(p: Patient, r: Pick<TimeRange, "from" | "to" | "error">) {
  if (r.error) return false;
  if (!r.from && !r.to) return true;
  return p.tanggal >= r.from && p.tanggal <= r.to;
}
export type SearchField = "semua" | "noSep" | "nama" | "rm" | "icd10" | "dpjp";
export function matchesSearchBy(p: Patient, q: string, field: SearchField) {
  if (field === "semua") return matchesSearch(p, q);
  const s = q.trim().toLowerCase();
  return !s || String(p[field] ?? "").toLowerCase().includes(s);
}
