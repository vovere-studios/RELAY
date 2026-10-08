import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type ThemePreference = 'light' | 'dark' | 'system';
const ThemeContext = createContext<{preference:ThemePreference; resolved:'light'|'dark'; setPreference:(value:ThemePreference)=>void} | null>(null);
export function ThemeProvider({children}:{children:ReactNode}) {
 const [preference,setState] = useState<ThemePreference>(()=>{try{const value=localStorage.getItem('relay-theme');return value==='light'||value==='dark'?value:'system';}catch{return 'system';}});
 const [resolved,setResolved] = useState<'light'|'dark'>(()=>document.documentElement.dataset.theme==='dark'?'dark':'light');
 useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{const value=preference==='system'?(media.matches?'dark':'light'):preference;document.documentElement.dataset.theme=value;setResolved(value);};
  apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[preference]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key==='relay-theme')setState(event.newValue==='light'||event.newValue==='dark'?event.newValue:'system');};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 function setPreference(value:ThemePreference){setState(value);try{localStorage.setItem('relay-theme',value);}catch{/* Appearance still works without persistent browser storage. */}}
 return <ThemeContext.Provider value={{preference,resolved,setPreference}}>{children}</ThemeContext.Provider>;
}
export function useTheme(){const value=useContext(ThemeContext);if(!value)throw new Error('ThemeProvider is required');return value;}
