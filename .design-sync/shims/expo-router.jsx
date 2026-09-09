/**
 * expo-router 대체 구현 (design-sync 번들 전용)
 *
 * claude.ai/design 안에서는 파일 기반 라우터가 없으므로, 앱이 쓰는 expo-router API 만
 * 메모리 라우터로 흉내 냅니다. 화면 코드는 그대로이고 별칭(tsconfig paths)으로 이 파일이 대신 붙습니다.
 *  · router.push/replace/back · usePathname · useLocalSearchParams · useGlobalSearchParams · useRouter
 *  · <Link href asChild> · <Redirect href> · <Slot>  (Slot 은 등록된 라우트 표에서 현재 경로의 컴포넌트를 그림)
 * 라우트 표는 .design-sync/screens/routes.jsx 가 registerRoutes() 로 등록합니다.
 */
import React, { createContext, useContext, useEffect } from 'react';
import { create } from 'zustand';

const parse = (href) => {
  if (href && typeof href === 'object') {
    return { pathname: href.pathname || '/', params: Object.fromEntries(Object.entries(href.params || {}).map(([k, v]) => [k, String(v)])) };
  }
  const [pathname, qs = ''] = String(href || '/').split('?');
  const params = {};
  new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
  return { pathname: pathname || '/', params };
};

export const useRouteStore = create((set, get) => ({
  pathname: '/',
  params: {},
  history: [],
  navigate: (href, replace = false) => {
    const next = parse(href);
    const { pathname, params, history } = get();
    if (next.pathname === pathname && JSON.stringify(next.params) === JSON.stringify(params)) return;
    set({ ...next, history: replace ? history : [...history, { pathname, params }] });
  },
  back: () => {
    const { history } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    set({ pathname: prev.pathname, params: prev.params, history: history.slice(0, -1) });
  },
}));

export const router = {
  push: (href) => useRouteStore.getState().navigate(href, false),
  navigate: (href) => useRouteStore.getState().navigate(href, false),
  replace: (href) => useRouteStore.getState().navigate(href, true),
  back: () => useRouteStore.getState().back(),
  canGoBack: () => useRouteStore.getState().history.length > 0,
  setParams: (params) => useRouteStore.setState((s) => ({ params: { ...s.params, ...params } })),
};

export const useRouter = () => router;
export const usePathname = () => useRouteStore((s) => s.pathname);
export const useLocalSearchParams = () => useRouteStore((s) => s.params);
export const useGlobalSearchParams = () => useRouteStore((s) => s.params);
export const useSegments = () => useRouteStore((s) => s.pathname).split('/').filter(Boolean);
export const useFocusEffect = (effect) => { useEffect(() => effect?.(), [effect]); };
export const useNavigation = () => ({ setOptions() {}, goBack: router.back, navigate: router.push });

/** <Link href asChild> — asChild 면 자식(Pressable 계열)에 onPress·href 를 얹고, 아니면 <a> 로 렌더 */
export function Link({ href, asChild, replace, children, onPress, style, ...rest }) {
  const go = (e) => {
    e?.preventDefault?.();
    onPress?.(e);
    router[replace ? 'replace' : 'push'](href);
  };
  const hrefStr = typeof href === 'string' ? href : href?.pathname || '/';
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onPress: go, href: hrefStr, accessibilityRole: 'link' });
  }
  return (
    <a href={hrefStr} onClick={go} style={{ textDecoration: 'none', color: 'inherit', ...style }} {...rest}>
      {children}
    </a>
  );
}

export function Redirect({ href }) {
  useEffect(() => { router.replace(href); }, [href]);
  return null;
}

/* ── Slot: 라우트 표 기반 렌더 ─────────────────────────────── */
let ROUTES = { layouts: [], pages: {}, notFound: null };
/**
 * @param {{ layouts: Array<{ match: (pathname:string)=>boolean, component: React.ComponentType }>, pages: Record<string, React.ComponentType>, notFound?: React.ComponentType }} table
 */
export function registerRoutes(table) { ROUTES = { ...ROUTES, ...table }; }

const SlotDepth = createContext(0);

const normalize = (p) => (p || '/').replace(/\/+$/, '') || '/';

function CurrentPage() {
  const pathname = useRouteStore((s) => s.pathname);
  const Page = ROUTES.pages[normalize(pathname)] || ROUTES.notFound;
  return Page ? <Page /> : null;
}

/**
 * depth 0(루트 레이아웃 안) → 경로에 맞는 그룹 레이아웃, depth 1(그룹 레이아웃 안) → 페이지.
 * 그룹 레이아웃이 없는 경로는 바로 페이지.
 */
export function Slot() {
  const depth = useContext(SlotDepth);
  const pathname = useRouteStore((s) => s.pathname);
  if (depth === 0) {
    const layout = ROUTES.layouts.find((l) => l.match(normalize(pathname)));
    if (layout) {
      const L = layout.component;
      return (
        <SlotDepth.Provider value={1}>
          <L />
        </SlotDepth.Provider>
      );
    }
  }
  return (
    <SlotDepth.Provider value={depth + 1}>
      <CurrentPage />
    </SlotDepth.Provider>
  );
}

export const Stack = ({ children }) => <>{children}</>;
Stack.Screen = () => null;
export const Tabs = Stack;
export const Href = null;
export default { router, Link, Redirect, Slot };
