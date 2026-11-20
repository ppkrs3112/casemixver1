import Papa from 'papaparse';
import { templates, validateRows, type UploadKind, type UploadRow } from './claim-sync';
import * as XLSX from 'xlsx';

export type SpreadsheetCell = string | number | boolean | Date | null;
export interface SheetGrid { name: string; grid: SpreadsheetCell[][] }

export async function readClaimFile(file: File): Promise<SheetGrid[]> {
  if (file.size > 10 * 1024 * 1024) throw new Error('File maksimal 10 MB');

  if (/\.(csv|tsv)$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>((await file.text()), { dynamicTyping: false, skipEmptyLines: 'greedy' });
    const issue = parsed.errors.find((e) => e.code == 'UndetectableDelimiter');
    if (issue) throw new Error(`CSV tidak valid: ${issue.message}`);
    return [{ name: file.name, grid: parsed.data }];
  }

  if (!/\.xlsx$/i.test(file.name)) throw new Error('Gunakan Excel .xlsx atau CSV');

  // PERBAIKAN: pakai xlsx, bukan read-excel-file lagi
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const result: SheetGrid[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as SpreadsheetCell[][];
    result.push({ name, grid });
  }
  return result;
}
