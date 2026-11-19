import { CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { periodLabel, type Mode, type PeriodFilter } from "@/lib/casemix";
import { cn } from "@/lib/utils";

const MODES: { key: Mode; label: string }[] = [
  { key: "harian", label: "Harian" },
  { key: "bulanan", label: "Bulanan" },
  { key: "tahunan", label: "Tahunan" },
];

export function PeriodBar({
  filter,
  onChange,
  search,
  onSearch,
  years,
}: {
  filter: PeriodFilter;
  onChange: (f: PeriodFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  years: string[];
}) {
  const sel =
    "h-10 rounded-xl border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  return (
    <div className="panel no-print sticky top-2 z-20 mb-4 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 md:w-auto">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange({ ...filter, mode: m.key })}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                filter.mode === m.key
                  ? "bg-primary text-primary-foreground shadow-lift"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          {filter.mode === "harian" && (
            <input
              type="date"
              aria-label="Pilih tanggal"
              className={cn(sel, "w-full sm:w-auto")}
              value={filter.tanggal}
              onChange={(e) => onChange({ ...filter, tanggal: e.target.value })}
            />
          )}
          {filter.mode === "bulanan" && (
            <input
              type="month"
              aria-label="Pilih bulan"
              className={cn(sel, "w-full sm:w-auto")}
              value={filter.bulan}
              onChange={(e) => onChange({ ...filter, bulan: e.target.value })}
            />
          )}
          {filter.mode === "tahunan" && (
            <select
              aria-label="Pilih tahun"
              className={cn(sel, "w-full sm:w-auto")}
              value={filter.tahun}
              onChange={(e) => onChange({ ...filter, tahun: e.target.value })}
            >
              <option value="">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari No SEP / Nama / No RM / ICD-10 / DPJP"
              className="pl-9"
            />
          </div>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" /> Periode:{" "}
        <b className="text-foreground">{periodLabel(filter)}</b>
        {search && <> · pencarian “{search}”</>}
      </p>
    </div>
  );
}
