import React, {createContext, useContext, useEffect, useSyncExternalStore, useMemo} from 'react';
const listeners = new Set();
const current = () => window.location.hash.slice(1) || '/login';
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
window.addEventListener('hashchange', () => listeners.forEach(fn=>fn()));
const hrefOf = href => typeof href === 'string' ? href : href.pathname + (href.params ? '?' + new URLSearchParams(href.params) : '');
function navigate(href, replace=false) {
  const hash = '#' + hrefOf(href);
  if (replace) window.location.replace(hash); else window.location.hash = hash;
}
export const router = {push:href=>navigate(href),replace:href=>navigate(href,true),back:()=>history.back(),canGoBack:()=>true,setParams:params=>navigate({pathname:current().split('?')[0],params},true)};
export const useRouter = () => router;
export const useRoute = () => useSyncExternalStore(subscribe,current,current);
export const usePathname = () => useRoute().split('?')[0];
export function useLocalSearchParams(){const route=useRoute();return useMemo(()=>Object.fromEntries(new URLSearchParams(route.split('?')[1]||'')),[route]);}
export const useGlobalSearchParams = useLocalSearchParams;
const Outlet = createContext(null);
export function Slot(){return useContext(Outlet);}
export function WithSlot({children,slot}){return <Outlet.Provider value={slot}>{children}</Outlet.Provider>;}
export function Redirect({href}){const target=hrefOf(href);useEffect(()=>{if(current()!==target)router.replace(target);},[target]);return null;}
export function Link({href,asChild,children,...rest}) {
 const target='#'+hrefOf(href);
 if(asChild) return React.cloneElement(React.Children.only(children),{...rest,href:target,accessibilityRole:'link',onPress:e=>{if(e?.metaKey||e?.ctrlKey)return;e?.preventDefault?.();router.push(href);}});
 return <a {...rest} href={target}>{children}</a>;
}
