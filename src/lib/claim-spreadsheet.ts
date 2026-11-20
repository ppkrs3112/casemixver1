import Papa from 'papaparse';
import { templates, validateRows, type UploadKind, type UploadRow } from './claim-sync';
export type SpreadsheetCell=string|number|boolean|Date|null;
export interface SheetGrid {name:string; grid:SpreadsheetCell[][]}
export async function readClaimFile(file:File):Promise<SheetGrid[]> {
 if(file.size>10*1024*1024)throw new Error('File maksimal 10 MB');
 if(/\.(csv|tsv)$/i.test(file.name)){const parsed=Papa.parse<string[]>(await file.text(),{dynamicTyping:false,skipEmptyLines:'greedy'});const issue=parsed.errors.find(e=>e.code!=='UndetectableDelimiter');if(issue)throw new Error(`CSV tidak valid: ${issue.message}`);return [{name:file.name,grid:parsed.data}];}
 if(!/\.xlsx$/i.test(file.name))throw new Error('Gunakan Excel .xlsx atau CSV');
 const {default:readXlsxFile,readSheetNames}=await import('read-excel-file/browser');const names=await readSheetNames(file);const result:SheetGrid[]=[];for(const name of names)result.push({name,grid:await readXlsxFile(file,{sheet:name}) as SpreadsheetCell[][]});return result;
}
export function defaultMapping(kind:UploadKind,headers:SpreadsheetCell[]){return templates[kind].map(h=>headers.findIndex(v=>String(v??'').trim().toLowerCase()===h.toLowerCase()));}
export function numericCell(v:SpreadsheetCell|undefined){if(typeof v==='number' && Number.isFinite(v)&&v>=0)return v;const text=String(v??'').trim();if(!/^\d+(\.\d+)?$/.test(text))throw new Error('Angka harus tanpa Rp atau pemisah ribuan (contoh 5500000)');return Number(text);}
export function previewClaimRows(kind:UploadKind,grid:SpreadsheetCell[][],headerRow:number,mapping:number[]):{rows:UploadRow[];errors:string[];total:number;sample:unknown[][]} {
 const headers=grid[headerRow-1]??[];const data=grid.slice(headerRow).map((cells,i)=>({cells,line:headerRow+i+1})).filter(r=>r.cells.some(v=>v!==null&&String(v).trim()!==''));const errors:string[]=[];const rows:UploadRow[]=[];
 if(data.length>5000)errors.push('Maksimal 5.000 baris per upload');
 if(mapping.some(i=>i<0||i>=headers.length)||new Set(mapping).size!==mapping.length)errors.push('Pilih kolom berbeda untuk setiap informasi');
 if(!data.length)errors.push('Tidak ada baris data');
 if(!errors.length)for(const {cells,line} of data){try {const values=mapping.map(i=>cells[i]);const text=(i:number)=>String(values[i]??'').trim();const n=(i:number)=>numericCell(values[i]);let raw:unknown;
 if(kind===1){const v=values[1];let tanggal=text(1);if(v instanceof Date)tanggal=v.toISOString().slice(0,10);if(typeof v==='number')tanggal=new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);raw={noSep:text(0),tanggal,nama:text(2),dpjp:text(3),billing:n(4)};}
 if(kind===2)raw={noSep:text(0),status:text(1).toLowerCase()==='layak'?'Layak':text(1).toLowerCase()==='pending'?'Pending':text(1),inacbgs:n(2)};
 if(kind===3)raw={noSep:text(0),hasil:text(1).toUpperCase(),nilai:n(2)};
 if(kind===4)raw={noSep:text(0),sdm:n(1),obat:n(2),lab:n(3),operasional:n(4),lainnya:n(5)};
 rows.push(...validateRows(kind,[raw]));
 }catch(e){errors.push(`Baris ${line}: ${e instanceof Error?e.message:'Data tidak valid'}`);}}
 if(!errors.length){try{validateRows(kind,rows);}catch(e){errors.push(e instanceof Error?e.message:'No SEP duplikat');}}
 return {rows,errors,total:data.length,sample:data.slice(0,5).map(r=>mapping.map(i=>r.cells[i]??''))};
}
