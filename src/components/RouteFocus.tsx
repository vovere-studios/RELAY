import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function contextKey(pathname:string,search:string) {
  const params=new URLSearchParams(search);
  return `${pathname}:${['org','view','supplier','q','page'].map(key=>params.get(key)||'').join(':')}`;
}
export function RouteFocus() {
  const { pathname, search } = useLocation();
  const previous = useRef<{ pathname: string; search: string; scroll:number } | null>(null);
  const positions=useRef(new Map<string,number>());
  useEffect(()=>{
    const record=()=>{if(previous.current)previous.current.scroll=window.scrollY;};
    window.addEventListener('scroll',record,{passive:true});
    return()=>window.removeEventListener('scroll',record);
  },[]);
  useLayoutEffect(() => {
    const before = previous.current;
    const oldParams = new URLSearchParams(before?.search);
    const nextParams = new URLSearchParams(search);
    const sameCompany=pathname==='/cloud'&&before?.pathname===pathname&&oldParams.get('org')===nextParams.get('org');
    const sameView=(oldParams.get('view')||'overview')===(nextParams.get('view')||'overview');
    // Filter, pagination and preview URLs are updates to the current workspace,
    // not page arrivals: keep the focused input and native scroll position.
    const preserve=sameCompany&&sameView&&oldParams.get('supplier')===nextParams.get('supplier');
    const returningToList=sameCompany&&sameView&&!!oldParams.get('supplier')&&!nextParams.get('supplier');
    if(before){positions.current.set(contextKey(before.pathname,before.search),before.scroll);if(positions.current.size>30)positions.current.delete(positions.current.keys().next().value!);}
    const saved=returningToList?positions.current.get(contextKey(pathname,search))||0:0;
    previous.current = { pathname, search, scroll:preserve ? before?.scroll||0:saved };
    const main = document.getElementById("main");
    if (!preserve) {
      window.scrollTo({ top: saved, behavior: "instant" });
      main?.focus({ preventScroll: true });
    }
    if(pathname==='/login')positions.current.clear();
    let restorePending=returningToList;
    const stopRestoring=()=>{restorePending=false;};
    window.addEventListener('wheel',stopRestoring,{passive:true});
    window.addEventListener('touchstart',stopRestoring,{passive:true});
    const update = () => {
      const heading = main?.querySelector("h1");
      const title = `${heading?.innerText.replace(/\s+/g, " ").replace(/\.$/, "") || "Workspace"} — Relay`;
      if (document.title !== title) document.title = title;
      // The previous list can be replaced by a loading surface while data arrives.
      if(restorePending&&!main?.querySelector('.workspace-refresh-status,.connected-loading')){
        window.scrollTo({top:saved,behavior:'instant'});restorePending=false;
      }
    };
    // Wait for the first completed data update before restoring a list.
    if(!returningToList)update();
    const observer = new MutationObserver(update);
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {observer.disconnect();window.removeEventListener('wheel',stopRestoring);window.removeEventListener('touchstart',stopRestoring);};
  }, [pathname, search]);
  return null;
}
