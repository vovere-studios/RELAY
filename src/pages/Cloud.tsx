import { LoadingIndicator } from '../components/ui';
import { MotionWords } from "../components/Motion";
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PublicHeader, PublicFooter } from './marketing/Website';
import { Button, Input } from '../components/ui';
import { requireSupabase } from '../lib/supabase';
function message(error: unknown) { return error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Please try again.'; }
export function CloudAccount({signup=false}:{signup?:boolean}) {
 const navigate=useNavigate();
 const [busy,setBusy]=useState(false), [error,setError]=useState(''), [email,setEmail]=useState(''), [sent,setSent]=useState(false), [retryAt,setRetryAt]=useState(0), [now,setNow]=useState(Date.now());
 const [details,setDetails]=useState({full_name:'',company_name:''});
 const destination=()=>{const invite=sessionStorage.getItem('relay-pending-invite');if(invite)return '/join#token='+encodeURIComponent(invite);const intake=sessionStorage.getItem('relay-pending-intake');return intake?'/cloud?return=intake':'/cloud';};
 useEffect(()=>{const client=requireSupabase();let active=true;void client.auth.getUser().then(({data})=>{if(active&&data.user)navigate(destination(),{replace:true});});const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(session)navigate(destination(),{replace:true});});return()=>{active=false;subscription.unsubscribe();};},[navigate]);
 useEffect(()=>{if(!sent)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[sent]);
 useEffect(()=>{setSent(false);setError('');},[signup]);
 async function sendCode(address:string,profile=details){
  setBusy(true);setError('');
  try {const {error}=await requireSupabase().auth.signInWithOtp({email:address,options:{shouldCreateUser:signup,emailRedirectTo:window.location.origin+'/account',...(signup?{data:profile}:{})}});if(error)throw error;setEmail(address);setDetails(profile);setSent(true);setRetryAt(Date.now()+60000);setNow(Date.now());}
  catch(e){setError(message(e));}finally{setBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);
  if(!sent){await sendCode(String(form.get('email')).trim(),{full_name:String(form.get('name')||'').trim(),company_name:String(form.get('company')||'').trim()});return;}
  setBusy(true);setError('');try{const token=String(form.get('code')).replace(/\s/g,'');const {data,error}=await requireSupabase().auth.verifyOtp({email,token,type:'email'});if(error)throw error;if(!data.session)throw new Error('Please request a new code and try again.');navigate(destination(),{replace:true});}catch(e){setError(message(e));}finally{setBusy(false);}
 }
 const remaining=Math.max(0,Math.ceil((retryAt-now)/1000));
 return <div className="public-site"><PublicHeader/><main id="main" tabIndex={-1} className="public-main access-main"><section className="access-copy"><span className="eyebrow">YOUR CONNECTED WORKSPACE.</span><h1><MotionWords>{signup?'A place for':'Back to'}</MotionWords><br/><MotionWords>your network.</MotionWords></h1><p>Company information.<br/>Private documents.<br/>A clearer picture.</p><span className="access-attribution">A product of VOVERE</span></section><section className="access-panel"><h2>{sent?'Check your inbox.':signup?'Create your account.':'Sign in to Relay.'}</h2><p>{sent?`Enter the verification code sent to ${email}. You can also use the sign-in link if your email contains one.`:'A secure code, sent to your work email. No password to remember.'}</p><form onSubmit={submit} key={sent?'code':'email'}>{sent?<label>Verification code<Input autoFocus required name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" minLength={6} maxLength={12} placeholder="Enter your code"/></label>:<>{signup&&<><label>Your name<Input required name="name" maxLength={100} autoComplete="name" defaultValue={details.full_name}/></label><label>Company name<Input required name="company" maxLength={160} autoComplete="organization" defaultValue={details.company_name}/></label></>}<label>Work email<Input required type="email" name="email" autoComplete="email" maxLength={254} defaultValue={email}/></label></>}{error&&<p role="alert" className="form-error">{error}</p>}<Button type="submit" disabled={busy}>{busy?<LoadingIndicator compact label={sent?'Verifying…':'Sending your code…'}/>:sent?'Verify and continue':'Send me a code'}<ArrowUpRight size={16}/></Button></form>{sent?<><button className="access-secondary" disabled={busy||remaining>0} onClick={()=>void sendCode(email)}>{remaining>0?`Resend available in ${remaining}s`:'Resend code'}</button><button className="access-secondary" disabled={busy} onClick={()=>{setSent(false);setError('');}}>Use a different email</button></>:<Link className="access-secondary" to={signup?'/login':'/signup'}>{signup?'Already have an account? Sign in':'New to Relay? Create an account'}</Link>}<div className="access-note"><strong>Private by company.</strong><span>Your company information stays in your private workspace. The example workspace remains separate.</span></div><Link className="access-secondary" to="/app">Explore the local demo <ArrowUpRight size={14}/></Link></section></main><PublicFooter/></div>;
}
