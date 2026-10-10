import { formValidationMessage } from '../lib/form-validation';
import { useState, type FormEvent } from 'react';
import { FieldLabel } from './FieldLabel';
import { Input } from './ui';
import { Select } from './Select';
import { ActionButton, OutcomeMark, useActionFeedback } from './ActionFeedback';
import { requireSupabase } from '../lib/supabase';
import { errorMessage } from '../lib/cloud-api';

/** Saving and sharing are separate: a failed send never discards the sender's document. */
export function WorkspaceResponseUpload({organizationId,onSaved}:{organizationId:string;onSaved:(id:string)=>void}) {
  const [error,setError]=useState('');const feedback=useActionFeedback();
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!feedback.begin('save'))return;setError('');const form=event.currentTarget;
    try {
      const values=new FormData(form);const file=values.get('file');
      if(!(file instanceof File)||!file.size||file.size>10*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PDF, PNG or JPEG up to 10 MB.');
      const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
      const valid=file.type==='application/pdf'?new TextDecoder().decode(signature).startsWith('%PDF-'):file.type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>signature[i]===b):signature[0]===255&&signature[1]===216&&signature[2]===255;
      if(!valid)throw new Error('The file does not match its declared format.');
      const client=requireSupabase();const {data,error:authError}=await client.auth.getUser();if(authError||!data.user)throw new Error('Sign in again before saving your document.');
      const id=crypto.randomUUID();const path=`${organizationId}/company/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const uploaded=await client.storage.from('relay-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;
      const saved=await client.from('documents').insert({id,organization_id:organizationId,supplier_id:null,name:file.name.slice(0,255),kind:String(values.get('kind')),mime_type:file.type,storage_path:path,uploaded_by:data.user.id});
      if(saved.error){await client.storage.from('relay-documents').remove([path]);throw saved.error;}
      feedback.succeed('save',()=>{form.reset();onSaved(id);});
    }catch(e){setError(errorMessage(e));feedback.fail('save');}
  }
  return <form className="response-upload-form" onInvalidCapture={event=>{event.preventDefault();setError(formValidationMessage(event.currentTarget));feedback.fail('save');}} onSubmit={save} onChange={()=>{setError('');feedback.reset('save');}}>
    <FieldLabel>Document type<Select name="kind" disabled={feedback.phase('save')==='pending'||feedback.phase('save')==='success'}><option value="certificate">Certificate</option><option value="declaration">Declaration / compliance statement</option><option value="company">Company / registration information</option></Select></FieldLabel>
    <FieldLabel>Your document<Input type="file" name="file" required accept="application/pdf,image/png,image/jpeg" disabled={feedback.phase('save')==='pending'||feedback.phase('save')==='success'}/></FieldLabel>
    <p>Saved privately in your company workspace. You choose whether to send it afterwards.</p>
    {error&&<div className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></div>}
    <ActionButton type="submit" label="Save to my workspace" pendingLabel="Saving document…" successLabel="Document saved" phase={feedback.phase('save')} outcomeKey={feedback.version('save')}/>
  </form>;
}
