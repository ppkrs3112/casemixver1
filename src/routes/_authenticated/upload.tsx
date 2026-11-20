import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ClaimUploadCard } from '@/components/casemix/ClaimUploadCard';
import { SyncDashboard } from '@/components/casemix/SyncDashboard';
import { claimUploadsQuery } from '@/lib/claim-sync-data';
import { meQuery } from '@/lib/data';
import { permissions } from '@/lib/casemix';
import type { UploadKind } from '@/lib/claim-sync';
export const Route=createFileRoute('/_authenticated/upload')({head:()=>({meta:[{title:'Upload & Sinkronisasi — Casemix RS'},{name:'description',content:'Upload Billing RS, jawaban BPJS, FPK 1 dan biaya riil berdasarkan No SEP.'},{property:'og:title',content:'Upload & Sinkronisasi — Casemix RS'},{property:'og:description',content:'Sinkronisasi klaim BPJS dan biaya riil rumah sakit.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),loader:({context})=>Promise.all([context.queryClient.ensureQueryData(claimUploadsQuery),context.queryClient.ensureQueryData(meQuery)]),component:UploadPage});
function UploadPage(){const {data:batches}=useSuspenseQuery(claimUploadsQuery);const {data:me}=useSuspenseQuery(meQuery);const qc=useQueryClient();const p=permissions(me);return <main className="min-w-0 space-y-6 p-4 md:p-6"><h1 className="text-2xl font-extrabold">Upload & Sinkronisasi</h1><div className="space-y-4">{([1,2,3,4] as UploadKind[]).map(kind=><ClaimUploadCard key={kind} kind={kind} batches={batches} allowed={kind===4?p.sdm&&p.ops:p.billing} onSaved={()=>qc.invalidateQueries({queryKey:['claim-uploads']})}/>)}</div><SyncDashboard/></main>;}
