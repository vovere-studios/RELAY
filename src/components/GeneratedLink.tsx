import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';
import { ActionButton, type ActionPhase } from './ActionFeedback';
import { Input } from './ui';
import { reducedMotion, springEasing } from '../lib/motion';

export function GeneratedLink({url,message,phase,outcomeKey,onCopy,invitation=false}:{url:string;message?:string;phase:ActionPhase;outcomeKey:number;onCopy:()=>void;invitation?:boolean}) {
  const surface=useRef<HTMLDivElement>(null);
  const previousHeight=useRef(0);
  useLayoutEffect(()=>{
    const element=surface.current;if(!element)return;
    const height=element.getBoundingClientRect().height;
    const start=previousHeight.current;previousHeight.current=height;
    if(reducedMotion())return;
    const expansion=element.animate([{height:`${start}px`,opacity:0},{height:`${height}px`,opacity:1}],{duration:480,easing:springEasing(480),fill:'backwards'});
    const content=element.firstElementChild!;
    const arrival=content.animate([{opacity:0,transform:'translateY(-10px) scale(.98)'},{opacity:1,transform:'none'}],{duration:480,delay:70,easing:springEasing(480),fill:'backwards'});
    return()=>{expansion.cancel();arrival.cancel();};
  },[url]);
  return <div ref={surface} className="generated-link-reveal"><section className="generated-link" aria-label="Your private link">
    <div className="generated-link-heading"><span className="generated-link-symbol" aria-hidden="true"><Link2 size={19} strokeWidth={1.7}/></span><div><strong>{invitation?"Your invitation is ready.":"Your private link is ready."}</strong><p>{message||'Share it with your supplier to receive documents securely.'}</p></div></div>
    <div className="generated-link-controls"><Input readOnly aria-label="Generated private link" value={url} onFocus={event=>event.currentTarget.select()}/><ActionButton variant="primary" phase={phase} outcomeKey={outcomeKey} label="Copy link" pendingLabel="Copying…" successLabel="Copied" onClick={onCopy}/></div>
    <div className="generated-link-footer"><span>{invitation?"Acceptance requires the invited email address.":"Only people with this link can submit."}</span><a href={url} target="_blank" rel="noopener noreferrer">Preview<ArrowUpRight size={14}/></a></div>
  </section></div>;
}
