import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers});
// This public endpoint authenticates an unguessable, revocable upload capability.
// It never grants access to existing files or arbitrary organization IDs.
Deno.serve(async req => {
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return respond({error:'Use POST.'},405);
 const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
 if(!secret)return respond({error:'Upload service unavailable.'},503);
 const client=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 let reservation: string|undefined; const paths:string[]=[];
 try {
  const length=Number(req.headers.get('content-length')||0);
  if(length>52*1024*1024)return respond({error:'Submission is too large.'},413);
  if(req.headers.get('content-type')?.includes('application/json')){
   const body=await req.json();
   if(body.action!=='info'||typeof body.token!=='string'||! /^[a-f0-9]{64}$/.test(body.token))return respond({error:'Invalid upload link.'},400);
   const {data,error}=await client.rpc('relay_intake_api',{action:'info',payload:{token:body.token}});
   if(error)return respond({error:'This upload link is expired, revoked, full or invalid.'},410);
   return respond(data);
  }
  // Bound the stream even when Content-Length is absent.
  const reader=req.body?.getReader(); if(!reader)return respond({error:'Choose your files.'},400);
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>52*1024*1024){await reader.cancel();return respond({error:'Submission is too large.'},413);}chunks.push(value);}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
  const form=await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type')||''},body:buffer}).formData();
  const token=String(form.get('token')||'');const name=String(form.get('name')||'').trim();const email=String(form.get('email')||'').trim();
  const kind=String(form.get('kind')||'certificate');const files=form.getAll('files').filter((file):file is File=>file instanceof File);
  if(!/^[a-f0-9]{64}$/.test(token)||name.length<1||name.length>100||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return respond({error:'Enter your name and email and use a valid link.'},400);
  if(!['certificate','declaration','company'].includes(kind)||files.length<1||files.length>5)return respond({error:'Choose between one and five files.'},400);
  for(const file of files){
   if(!file.size||file.size>10*1024*1024||file.name.length>255||!['application/pdf','image/png','image/jpeg'].includes(file.type))return respond({error:'Choose PDF, PNG or JPEG files, up to 10 MB each.'},400);
   const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
   const valid=file.type==='application/pdf'?new TextDecoder().decode(signature).startsWith('%PDF-'):file.type==='image/png'?[137,80,78,71,13,10,26,10].every((byte,i)=>signature[i]===byte):signature[0]===255&&signature[1]===216&&signature[2]===255;
   if(!valid)return respond({error:'A file does not match its declared format.'},400);
  }
  const reserved=await client.rpc('relay_intake_api',{action:'reserve',payload:{token,file_count:files.length}});
  if(reserved.error)return respond({error:'This upload link is no longer available or cannot accept that many files.'},410);
  reservation=reserved.data.reservation_id; const records=[];
  for(const file of files){
   const id=crypto.randomUUID();const filename=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')||'document';
   const path=`${reserved.data.organization_id}/${reserved.data.supplier_id}/${id}/${filename}`;paths.push(path);
   const uploaded=await client.storage.from('relay-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw new Error('upload');
   records.push({id,path,name:file.name,kind,mime_type:file.type});
  }
  const finished=await client.rpc('relay_intake_api',{action:'finish',payload:{reservation_id:reservation,name,email,files:records}});
  if(finished.error)throw new Error('record');
  return respond(finished.data);
 } catch {
  if(paths.length)await client.storage.from('relay-documents').remove(paths);
  if(reservation)await client.rpc('relay_intake_api',{action:'cancel',payload:{reservation_id:reservation}});
  return respond({error:'The submission could not be completed. Please try again.'},400);
 }
});
