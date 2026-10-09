import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, UserRound } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { errorMessage } from '../lib/cloud-api';
import { ActionButton, OutcomeMark, useActionFeedback } from './ActionFeedback';
import { Button, Input } from './ui';
type Profile={full_name:string;avatar_path?:string|null};
export function useAccountProfile(userId?:string) {
 const [profile,setProfile]=useState<Profile|null>(null);const [url,setUrl]=useState('');const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState('');const [revision,setRevision]=useState(0);const previousUser=useRef(userId);
 useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener('relay-profile-updated',refresh);return()=>window.removeEventListener('relay-profile-updated',refresh);},[]);
 useEffect(()=>{
  if(!userId)return;
  let active=true;let imageTimer:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  setLoading(true);setLoadError('');
  if(previousUser.current!==userId){setProfile(null);setUrl('');previousUser.current=userId;}
  async function refreshImage(path:string){
   const result=await requireSupabase().storage.from('relay-avatars').createSignedUrl(path,3600);
   if(active){setUrl(result.data?.signedUrl||'');imageTimer=setTimeout(()=>void refreshImage(path),50*60*1000);}
  }
  void Promise.resolve(requireSupabase().from('profiles').select('*').eq('id',userId).abortSignal(controller.signal).maybeSingle()).then(async({data,error})=>{
   if(!active)return;
   if(error){setLoadError(controller.signal.aborted?'The connection took too long. Please try again.':errorMessage(error));return;}
   setProfile(data);if(data?.avatar_path)await refreshImage(data.avatar_path);else setUrl('');
  }).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);});
  return()=>{active=false;clearTimeout(timeout);clearTimeout(imageTimer);controller.abort();};
 },[userId,revision]);
 return {profile,url,loading,loadError,retry:()=>setRevision(v=>v+1)};
}
export function AccountProfile({userId,email,onDirtyChange}:{userId:string;email:string;onDirtyChange?:(dirty:boolean)=>void}) {
 const {profile,url,loading,loadError,retry}=useAccountProfile(userId);const [name,setName]=useState('');const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState('');const [remove,setRemove]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const feedback=useActionFeedback();const lock=useRef(false);
 useEffect(()=>{if(profile)setName(profile.full_name);},[profile?.full_name]);
 const dirty=!!profile&&(name!==profile.full_name||!!file||remove);
 useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
 const imageReady=!!profile&&Object.prototype.hasOwnProperty.call(profile,'avatar_path');
 useEffect(()=>{if(!file){setPreview('');return;}const next=URL.createObjectURL(file);setPreview(next);return()=>URL.revokeObjectURL(next);},[file]);
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(loading||loadError||lock.current||!feedback.begin('profile'))return;lock.current=true;setBusy(true);setError('');const form=new FormData(event.currentTarget);let uploaded='';
 try{let path=profile?.avatar_path||null;if(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4*1024*1024||!file.size)throw new Error('Choose a PNG, JPEG or WebP image up to 4 MB.');uploaded=`${userId}/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;const result=await requireSupabase().storage.from('relay-avatars').upload(uploaded,file,{upsert:false,contentType:file.type});if(result.error)throw result.error;path=uploaded;}else if(remove)path=null;
 const result=await requireSupabase().from('profiles').upsert({id:userId,full_name:String(form.get('full_name')||'').trim(),...(imageReady?{avatar_path:path}:{})});if(result.error)throw result.error;
 const previous=profile?.avatar_path;if(previous&&previous!==path)void requireSupabase().storage.from('relay-avatars').remove([previous]);
 feedback.succeed('profile');onDirtyChange?.(false);setFile(null);setRemove(false);window.dispatchEvent(new Event('relay-profile-updated'));
 }catch(e){if(uploaded)void requireSupabase().storage.from('relay-avatars').remove([uploaded]);setError(errorMessage(e));feedback.fail('profile');}finally{lock.current=false;setBusy(false);}}
 return <form className="profile-settings" onSubmit={save} onChange={()=>feedback.reset('profile')}><div className="supplier-section-heading"><div><h2>Your profile</h2><p>Your identity in your company workspace.</p></div></div><div className="profile-photo-row"><span className="profile-photo">{!remove&&(preview||url)?<img src={preview||url} alt="Your profile"/>:<UserRound size={30} strokeWidth={1.4}/>}</span><div><label className={`button button-secondary profile-photo-picker ${!imageReady?'is-disabled':''}`}><Camera size={16}/>Choose photo<input aria-label="Choose profile photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||!imageReady} onChange={e=>{setFile(e.target.files?.[0]||null);setRemove(false);setError('');}}/></label><p>{imageReady?'PNG, JPEG or WebP · up to 4 MB':'Profile images are being activated.'}</p>{imageReady&&(url||file)&&<Button variant="ghost" type="button" disabled={busy} onClick={()=>{setFile(null);setRemove(true);}}>Remove photo</Button>}</div></div><label>Full name<Input name="full_name" autoComplete="name" maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy||loading||!!loadError}/></label><label>Email<Input type="email" readOnly value={email}/><small>Manage your sign-in address in account security.</small></label>{loadError&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{loadError}</span><Button type="button" variant="ghost" onClick={retry}>Retry</Button></div>}{error&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}<ActionButton type="submit" phase={feedback.phase('profile')} label={loading?"Opening profile…":"Save profile"} successLabel="Profile saved" disabled={busy||loading||!!loadError}/>{dirty&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>{setName(profile?.full_name||'');setFile(null);setRemove(false);setError('');feedback.reset('profile');}}>Discard changes</Button>}</form>;
}
