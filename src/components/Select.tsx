import { useEffect, useId, useRef, useState, type SelectHTMLAttributes, type ChangeEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** The native control owns form values/validation; the popover supplies a consistent desktop menu. */
export function Select({ children, className = '', value, defaultValue, onChange, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
 const native = useRef<HTMLSelectElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 const menu = useRef<HTMLDivElement>(null);
 const id = useId();
 const [current, setCurrent] = useState(String(value ?? defaultValue ?? ''));
 const [open, setOpen] = useState(false);
 const [invalid, setInvalid] = useState(false);
 const [label, setLabel] = useState('');
 const [active, setActive] = useState(0);
 const [options, setOptions] = useState<{value:string;label:string;disabled:boolean}[]>([]);
 const keyboard = useRef(false);
 const search = useRef({text:'',time:0});
 useEffect(() => {
  const select = native.current!;
  setOptions(Array.from(select.options, o => ({value:o.value,label:o.text,disabled:o.disabled})));
  setCurrent(select.value);
  setLabel(Array.from(select.labels ?? []).map(label => Array.from(label.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim()).join(' '));
  const reset = () => requestAnimationFrame(() => setCurrent(select.value));
  select.form?.addEventListener('reset', reset);
  return () => select.form?.removeEventListener('reset', reset);
 }, [children, value, defaultValue]);
 useEffect(() => {
  if (!open) return;
  const position = () => {
   const rect = trigger.current!.getBoundingClientRect();
   const panel = menu.current!;
   const space = innerHeight - rect.bottom - 16;
   const above = space < 180 && rect.top > space;
   panel.style.width = `${Math.min(rect.width, innerWidth - 24)}px`;
   panel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - rect.width - 12))}px`;
   panel.style.maxHeight = `${Math.max(100, Math.min(320, above ? rect.top - 16 : space))}px`;
   panel.style.top = above ? 'auto' : `${rect.bottom + 6}px`;
   panel.style.bottom = above ? `${innerHeight - rect.top + 6}px` : 'auto';
  };
  position();
  menu.current?.showPopover();
  const dismiss = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
  document.addEventListener('pointerdown', dismiss);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  return () => { document.removeEventListener('pointerdown',dismiss); menu.current?.hidePopover(); window.removeEventListener('resize',position); window.removeEventListener('scroll',position,true); };
 }, [open]);
 useEffect(() => { if (open) menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'}); }, [active, open]);
 const choose = (index:number) => {
  const option=options[index]; if (!option || option.disabled) return;
  const select=native.current!; select.value=option.value;
  setCurrent(option.value); setInvalid(false); onChange?.({target:select,currentTarget:select} as ChangeEvent<HTMLSelectElement>);
  setOpen(false); trigger.current?.focus();
 };
 const move = (direction:number) => {
  let next=active;
  for(let i=0;i<options.length;i++){next=(next+direction+options.length)%options.length;if(!options[next].disabled)break;}
  setActive(next);
 };
 const selected=options.find(o=>o.value===current);
 return <span className={`select-control ${className}`}>
  <select {...props} value={value} defaultValue={defaultValue} ref={native} className="select-native" tabIndex={-1} aria-hidden="true" onChange={event=>{setCurrent(event.target.value);onChange?.(event);}} onInvalid={event=>{event.preventDefault();setInvalid(true);trigger.current?.focus();}}>{children}</select>
  <button ref={trigger} type="button" className="select-trigger" disabled={props.disabled} role="combobox" aria-label={props['aria-label'] || label || undefined} aria-invalid={invalid || undefined} aria-labelledby={props['aria-labelledby']} aria-required={props.required} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined}
   onClick={()=>{keyboard.current=false;setActive(Math.max(0,options.findIndex(o=>o.value===current)));setOpen(!open);}}
   onKeyDown={event=>{
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(!open){keyboard.current=true;setOpen(true);setActive(Math.max(0,options.findIndex(o=>o.value===current)));}else if(event.key==='Home')setActive(options.findIndex(o=>!o.disabled));else if(event.key==='End')setActive(options.length-1-[...options].reverse().findIndex(o=>!o.disabled));else move(event.key==='ArrowDown'?1:-1);}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)choose(active);else{keyboard.current=true;setActive(Math.max(0,options.findIndex(o=>o.value===current)));setOpen(true);}}
    else if(event.key==='Escape'){if(open){event.preventDefault();event.stopPropagation();setOpen(false);}}
    else if(event.key==='Tab')setOpen(false);
    else if(event.key.length===1){search.current={text:(Date.now()-search.current.time<600?search.current.text:'')+event.key.toLowerCase(),time:Date.now()};const index=options.findIndex(o=>!o.disabled&&o.label.toLowerCase().startsWith(search.current.text));if(index>=0){setActive(index);if(!open)choose(index);}}
   }}><span>{selected?.label || 'Choose an option'}</span><ChevronDown size={16} aria-hidden="true" /></button>
  <div ref={menu} id={id} role="listbox" className="select-menu" data-keyboard={keyboard.current} popover="manual" onToggle={event=>{if((event as unknown as {newState:string}).newState==='closed')setOpen(false);}}>
   {options.map((option,index)=><div key={`${option.value}-${index}`} id={`${id}-${index}`} role="option" aria-selected={option.value===current} aria-disabled={option.disabled} data-index={index} data-active={index===active} className="select-option" onPointerMove={()=>!option.disabled&&setActive(index)} onMouseDown={event=>event.preventDefault()} onClick={event=>{event.preventDefault();choose(index);}}><span>{option.label}</span>{option.value===current&&<Check size={15} aria-hidden="true" />}</div>)}
  </div>
  {invalid && <span className="select-error" role="alert">Choose an option to continue.</span>}
 </span>;
}
