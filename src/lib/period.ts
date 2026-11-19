import type { Patient, PeriodFilter, Mode } from "@/lib/casemix";
import { todayISO } from "@/lib/download";

export function defaultFilter(list: Patient[], mode: Mode = "bulanan"): PeriodFilter {
  const latest = list.reduce((m, p) => (p.tanggal > m ? p.tanggal : m), "") || todayISO();
  return { mode, tanggal: latest, bulan: latest.slice(0, 7), tahun: latest.slice(0, 4) };
}

export function yearsOf(list: Patient[]) {
  const s = new Set(list.map((p) => p.tanggal.slice(0, 4)));
  s.add(todayISO().slice(0, 4));
  return [...s].sort().reverse();
}
