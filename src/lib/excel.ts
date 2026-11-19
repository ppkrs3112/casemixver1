import { toCsv, type Patient } from "@/lib/casemix";
export async function exportExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const file = writeXlsxFile(
    [
      headers.map((value) => ({ value, fontWeight: "bold" as const })),
      ...rows.map((row) =>
        row.map((value) => ({ value, type: typeof value === "number" ? Number : String })),
      ),
    ],
    { columns: headers.map(() => ({ width: 22 })) },
  );
  await file.toFile(filename);
}
export async function exportPatientsExcel(filename: string, patients: Patient[]) {
  // Reuse the canonical export order; CSV quoting is parsed without changing numeric values.
  const text = toCsv(patients);
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quote) {
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  records.push(row);
  const headers = records.shift() ?? [];
  const numericColumns = new Set(["TambahanNaikKelas", "INACBGs", "Billing", "JasaDPJP", "JasaDU", "JasaPenunjang", "Konsul", "Farmasi", "Lab", "Radiologi", "Darah", "PA", "OpsLain", "LOS", "TotalPendapatan", "AlokasiSDM", "SDMTerpakai", "SisaSDM", "AlokasiOps", "OpsTerpakai", "SisaOps", "Investasi", "Selisih", "CRR", "Saving"]);
  await exportExcel(filename, headers, records.map(record => record.map((value, index) => numericColumns.has(headers[index] ?? "") && value !== "-" ? Number(value) : value)));
}
