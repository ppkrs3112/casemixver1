import { z } from 'zod';
export type UploadKind = 1 | 2 | 3 | 4;
const money = z.number().finite().nonnegative().max(1e15);
const sep = z.string().trim().min(1, 'No SEP wajib diisi').max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD').refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Tanggal tidak valid');
export const billingSchema = z.object({ noSep: sep, tanggal: date, nama: z.string().trim().min(1), dpjp: z.string(), billing: money });
export const bpjsSchema = z.object({ noSep: sep, status: z.enum(['Layak','Pending']), inacbgs: money });
export const fpkSchema = z.object({ noSep: sep, hasil: z.enum(['ACC','TIDAK ACC']), nilai: money });
export const costSchema = z.object({ noSep: sep, sdm: money, obat: money, lab: money, operasional: money, lainnya: money });
export type BillingRow = z.infer<typeof billingSchema>;
export type BpjsRow = z.infer<typeof bpjsSchema>;
export type FpkRow = z.infer<typeof fpkSchema>;
export type CostRow = z.infer<typeof costSchema>;
export type UploadRow = BillingRow | BpjsRow | FpkRow | CostRow;
export const schemas = { 1: billingSchema, 2: bpjsSchema, 3: fpkSchema, 4: costSchema };
export const templates: Record<UploadKind,string[]> = {1:['No SEP','Tanggal','Nama','DPJP','Billing RS'],2:['No SEP','Status Awal','INACBGs Awal'],3:['No SEP','Hasil FPK1','Nilai FPK1'],4:['No SEP','Biaya SDM','Biaya Obat','Biaya Lab','Biaya Operasional','Biaya Lainnya']};
export const titles: Record<UploadKind,string> = {1:'Upload Billing RS',2:'Upload Jawaban BPJS',3:'Upload FPK 1',4:'Upload Biaya Riil'};
export const sepKey = (v:string) => v.trim().toUpperCase();
export interface UploadBatch { id:string; kind:UploadKind; filename:string; rows:UploadRow[]; created_at:string; revoked_at:string|null }
export interface SyncedRow extends BillingRow { awal: 'Layak'|'Pending'|'Belum Ada'; final: 'Layak'|'Menunggu FPK1'|'Tidak Layak'|'Belum Ada BPJS'; initial:number; income:number; costs:CostRow|null; fpk:FpkRow|null; totalCost:number; difference:number; profit:number; sdmPct:number|null; opsPct:number|null; drugPct:number|null }
export function validateRows(kind:UploadKind, input:unknown[]):UploadRow[] {
 if (!input.length || input.length > 5000) throw new Error('Upload harus berisi 1–5.000 baris');
 const seen = new Set<string>();
 return input.map((raw,i) => { const parsed=schemas[kind].safeParse(raw); if(!parsed.success) throw new Error(`Baris ${i+2}: ${parsed.error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')}`); const key=sepKey(parsed.data.noSep); if(seen.has(key)) throw new Error(`Baris ${i+2}: No SEP duplikat ${key}`); seen.add(key); return {...parsed.data,noSep:key}; });
}
export function syncUploads(batches:UploadBatch[]) {
 const billing=new Map<string,BillingRow>(), bpjs=new Map<string,BpjsRow>(), fpk=new Map<string,FpkRow>(), costs=new Map<string,CostRow>();
 const active=batches.filter(b=>!b.revoked_at).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 for(const b of active) for(const raw of b.rows) {const key=sepKey(raw.noSep); if(b.kind===1) billing.set(key,billingSchema.parse(raw)); if(b.kind===2){const next=bpjsSchema.parse(raw); const old=bpjs.get(key); if(!old || old.status!==next.status || old.inacbgs!==next.inacbgs) fpk.delete(key); bpjs.set(key,next);} if(b.kind===3 && billing.has(key) && bpjs.get(key)?.status==='Pending') fpk.set(key,fpkSchema.parse(raw)); if(b.kind===4) costs.set(key,costSchema.parse(raw)); }
 const rows:SyncedRow[]=[...billing].map(([key,b])=> {const answer=bpjs.get(key), decision=answer?.status==='Pending'?fpk.get(key):undefined, cost=costs.get(key); const final= !answer?'Belum Ada BPJS':answer.status==='Layak'?'Layak':!decision?'Menunggu FPK1':decision.hasil==='ACC'?'Layak':'Tidak Layak'; const income=answer?.status==='Layak'?answer.inacbgs:decision?.hasil==='ACC'?decision.nilai:0; const totalCost=cost?cost.sdm+cost.obat+cost.lab+cost.operasional+cost.lainnya:0; return {...b,noSep:key,awal:answer?.status??'Belum Ada',final,initial:answer?.inacbgs??0,income,costs:cost??null,fpk:decision??null,totalCost,difference:income-b.billing,profit:income-totalCost,sdmPct:income&&cost?cost.sdm/income*100:null,opsPct:income&&cost?cost.operasional/income*100:null,drugPct:income&&cost?cost.obat/income*100:null}; });
 const differences:{noSep:string;reason:string}[]=[];
 for(const key of bpjs.keys()) if(!billing.has(key)) differences.push({noSep:key,reason:'Data BPJS ada, data RS tidak ada'});
 if(active.some(b=>b.kind===2)) for(const key of billing.keys()) if(!bpjs.has(key)) differences.push({noSep:key,reason:'Data RS ada, data BPJS tidak ada'});
 for(const key of costs.keys()) if(!billing.has(key)) differences.push({noSep:key,reason:'Biaya riil ada, data RS tidak ada'});
 return {rows,differences,active};
}
export function validateSequence(kind:UploadKind, rows:UploadRow[], batches:UploadBatch[]) {
 const s=syncUploads(batches); if(kind!==1 && !s.active.some(b=>b.kind===1)) throw new Error('Upload File 01 Billing RS terlebih dahulu');
 if(kind===3) for(const row of rows) if(!s.rows.some(p=>p.noSep===sepKey(row.noSep)&&p.awal==='Pending')) throw new Error(`No SEP ${row.noSep}: FPK 1 hanya untuk pasien Pending di Billing RS`);
}
export function syncTotals(rows:SyncedRow[]) {
 const sum=(key:'initial'|'income'|'totalCost'|'profit')=>rows.reduce((s,r)=>s+r[key],0);
 const avg=(key:'sdmPct'|'opsPct'|'drugPct')=> {const values=rows.flatMap(r=>r[key]===null?[]:[r[key]]); return values.length?values.reduce((s,v)=>s+v,0)/values.length:null;};
 return {initial:sum('initial'),income:sum('income'),cost:sum('totalCost'),profit:sum('profit'),langsung:rows.filter(r=>r.awal==='Layak').length,pending:rows.filter(r=>r.awal==='Pending').length,acc:rows.filter(r=>r.fpk?.hasil==='ACC').length,rejected:rows.filter(r=>r.fpk?.hasil==='TIDAK ACC').length,layak:rows.filter(r=>r.final==='Layak').length,tidak:rows.filter(r=>r.final==='Tidak Layak').length,waiting:rows.filter(r=>r.final==='Menunggu FPK1').length,sdm:avg('sdmPct'),ops:avg('opsPct'),obat:avg('drugPct')};
}
