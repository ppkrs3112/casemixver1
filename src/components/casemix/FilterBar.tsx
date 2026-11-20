import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Choice } from "@/components/casemix/Choice";
import { TIME_KINDS, timeRange, type SearchField, type TimeKind, type TimeRange } from "@/lib/casemix";
import { todayISO } from "@/lib/download";

export interface TimeState {
  kind: TimeKind;
  offset: number;
  custom: { from: string; to: string };
}
export const DEFAULT_TIME: TimeState = { kind: "bulan", offset: 0, custom: { from: "", to: "" } };
export const rangeOf = (s: TimeState): TimeRange => timeRange(s.kind, todayISO(), s.offset, s.custom);

function usePersisted(key: string) {
  const [v, setV] = useState(false);
  useEffect(() => setV(localStorage.getItem(key) === "1"), [key]);
  return [v, (n: boolean) => { setV(n); localStorage.setItem(key, n ? "1" : "0"); }] as const;
}
const FIELDS: { value: SearchField; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "noSep", label: "No SEP" },
  { value: "nama", label: "Nama" },
  { value: "rm", label: "No RM" },
  { value: "icd10", label: "ICD-10" },
  { value: "dpjp", label: "DPJP" },
];

export function FilterBar({
  time, onTime, search, field, onSearch, count, advanced, onReset,
}: {
  time: TimeState;
  onTime: (t: TimeState) => void;
  search: string;
  field: SearchField;
  onSearch: (q: string, f: SearchField) => void;
  count: number;
  advanced?: ReactNode;
  onReset?: () => void;
}) {
  const r = rangeOf(time);
  const [showSearch, setShowSearch] = usePersisted("casemix-show-search");
  const [showAdv, setShowAdv] = usePersisted("casemix-show-advanced");
  const [draft, setDraft] = useState(search);
  const [custom, setCustom] = useState(time.custom);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(search), [search]);
  const customErr = custom.from && custom.to && custom.to < custom.from
    ? "Tanggal Selesai tidak boleh sebelum Tanggal Mulai" : "";
  const shift = time.kind === "bulan" || time.kind === "tahun";
  function toggleSearch() {
    if (showSearch) { setShowSearch(false); onSearch("", "semua"); }
    else { setShowSearch(true); requestAnimationFrame(() => input.current?.focus()); }
  }
  return (
    <section id="dashboard-filters" className="no-print space-y-3 rounded-lg border border-border-soft bg-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-44">
          <Choice id="time-kind" label="Jenis Periode" value={time.kind}
            onChange={(v) => onTime({ ...time, kind: v as TimeKind, offset: 0 })} options={TIME_KINDS} />
        </div>
        {shift && (
          <div className="flex items-center rounded-lg border border-border-soft">
            <Button variant="ghost" size="icon" aria-label="Periode sebelumnya" onClick={() => onTime({ ...time, offset: time.offset - 1 })}><ChevronLeft /></Button>
            <span className="min-w-28 px-1 text-center text-xs font-semibold">{r.label}</span>
            <Button variant="ghost" size="icon" aria-label="Periode berikutnya" onClick={() => onTime({ ...time, offset: time.offset + 1 })}><ChevronRight /></Button>
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant={showSearch ? "secondary" : "outline"} onClick={toggleSearch} aria-expanded={showSearch} aria-label={showSearch ? "Sembunyikan pencarian" : "Cari Pasien"}>
            {showSearch ? <ChevronUp /> : <Search />}
            <span className="hidden sm:inline">{showSearch ? "Sembunyikan" : "Cari Pasien"}</span>
          </Button>
          {advanced && (
            <Button variant={showAdv ? "secondary" : "outline"} onClick={() => setShowAdv(!showAdv)} aria-expanded={showAdv}>
              <SlidersHorizontal /><span className="hidden sm:inline">Filter Lanjutan</span>
            </Button>
          )}
          <Button variant="ghost" onClick={() => { onTime(DEFAULT_TIME); setCustom(DEFAULT_TIME.custom); onReset?.(); }}>
            <RotateCcw /><span className="hidden sm:inline">Reset Filter</span>
          </Button>
        </div>
      </div>
      {time.kind === "kustom" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs font-medium">Tanggal Mulai
            <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs font-medium">Tanggal Selesai
            <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </label>
          <Button disabled={!custom.from || !custom.to || !!customErr} onClick={() => onTime({ ...time, custom })}>Terapkan</Button>
          {customErr && <p className="w-full text-sm font-medium text-destructive">{customErr}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Menampilkan: <b className="text-foreground">{r.error && time.kind === "kustom" && !time.custom.from ? "pilih rentang lalu Terapkan" : r.label}</b>
        {r.days ? ` (${r.days} hari)` : ""} • {count} pasien
      </p>
      {showSearch && (
        <div className="search-slide">
          <form className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); onSearch(draft, field); }}>
            <Input ref={input} autoFocus aria-label="Cari pasien" className="flex-1" placeholder="Cari No SEP / Nama / No RM / ICD-10 / DPJP…"
              value={draft} onChange={(e) => { setDraft(e.target.value); onSearch(e.target.value, field); }} />
            <div className="sm:w-36">
              <Choice id="search-field" label="Cari Berdasarkan" value={field} onChange={(v) => onSearch(draft, v as SearchField)} options={FIELDS} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Cari</Button>
              <Button type="button" variant="outline" onClick={() => { setDraft(""); onSearch("", field); }}>Hapus</Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Tutup pencarian" onClick={toggleSearch}><X /></Button>
            </div>
          </form>
          {search && <p className="mt-1 text-xs text-muted-foreground">Hasil: {count} pasien ditemukan</p>}
        </div>
      )}
      {advanced && showAdv && <div className="grid gap-3 border-t border-border-soft pt-3 sm:grid-cols-2 lg:grid-cols-4">{advanced}</div>}
    </section>
  );
}
