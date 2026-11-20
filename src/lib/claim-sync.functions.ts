import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validateRows, validateSequence, type UploadBatch } from './claim-sync';
export const saveClaimUpload = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((raw:unknown)=>z.object({kind:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),filename:z.string().min(1).max(255),rows:z.array(z.unknown()).min(1).max(5000)}).parse(raw)).handler(async({data,context})=>{
 const rows=validateRows(data.kind,data.rows);
 const required=data.kind===4?['sdm','ops']:['billing'];
 for(const perm of required){const check=await context.supabase.rpc('has_perm',{_user_id:context.userId,_perm:perm}); if(check.error||!check.data) throw new Error('Hak akses upload tidak tersedia');}
 const {data:batches,error}=await context.supabase.from('claim_uploads').select('*').is('revoked_at',null).order('created_at');
 if(error) throw new Error('Gagal membaca riwayat upload');
 validateSequence(data.kind,rows,(batches??[]) as unknown as UploadBatch[]);
 const saved=await context.supabase.from('claim_uploads').insert({kind:data.kind,filename:data.filename,rows:JSON.parse(JSON.stringify(rows)),created_by:context.userId}).select('id').single();
 if(saved.error) throw new Error('Upload gagal disimpan. Periksa hak akses dan coba kembali.');
 return {id:saved.data.id,count:rows.length};
});
