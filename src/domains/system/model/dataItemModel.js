/**
 * [Model] SY-03 항목 관리 — 표시 항목(이름) 묶기 (2026-10-07 데이터 항목 설계 7.1 이후 · WEB 선행)
 *
 * 관리자가 「불량 수량」 처럼 **화면에 보이는 이름**으로 가릴 대상을 고르게 하려고, 업무 화면의 표 열을 항목으로 묶습니다.
 * 같은 이름의 열, 같은 값 이름(응답 필드명)을 쓰는 열을 한 항목으로 잇습니다.
 *   예) 「불량 수량」(ngQty · value@qc-defect) ── ngQty ── 「불량」(prod-result) → 한 항목
 *
 * 지금 DB 는 값 이름 하나가 전역에서 한 종류에만 붙습니다(tb_sys_data_field_attr UNIQUE). 그래서
 *  · **공용 키**(value · rate · total …, 화면마다 뜻이 다른 이름)는 항목을 잇는 데 쓰지 않고, 고를 수도 없습니다.
 *    고르면 다른 화면의 엉뚱한 값까지 가려집니다. 2단계(화면 · API 범위 별칭)에서 풉니다.
 *  · 이름이 같아도 뜻이 다른 열(「모델」 = 제품 모델 / LLM 모델 등)은 이름으로 잇지 않습니다(SPLIT_TITLES).
 *
 * 이 파일은 계산만 합니다(스토어 · 화면 목록을 직접 읽지 않음) — 시험에서 그대로 불러 씁니다.
 */

/**
 * 공용 키 — 여러 화면에서 서로 다른 값을 담는 응답 필드명. 항목을 잇지 않고 고를 수 없습니다.
 * 서버가 같은 목록을 내려 주게 되면(설계 5.1 `DATA_ATTR_GENERIC`) 그것으로 바꿉니다.
 */
export const GENERIC_ATTRS = new Set([
  'value', 'rate', 'ratio', 'total', 'cnt', 'count', 'amount', 'product', 'eqpt', 'spec', 'plan', 'actual',
  'memo', 'remark', 'name', 'type', 'result', 'label', 'target', 'week', 'scope', 'code',
]);

/** 이름이 같아도 뜻이 다를 수 있어 이름으로 잇지 않는 열 제목 */
export const SPLIT_TITLES = new Set(['모델', '상태', '구분', '유형', '비고', '합계', '비중', '값']);

/** 열 제목 정리 — 줄바꿈 · 겹친 공백 */
export const normTitle = (t) => String(t || '').replace(/\s+/g, ' ').trim();

/**
 * 표시 항목 목록을 만듭니다.
 *
 * @param {object} p
 * @param {Array<{id,name,rows:Array<{field,title}>}>} p.screens 업무 화면(시스템관리 제외)과 화면의 열
 * @param {Array<{key,name,attrs}>} p.kinds 종류(attrs 는 문자열 · 객체 배열)
 * @param {Set<string>} p.reserved 예약어(서버 reservedAttrs)
 * @param {(kind:object, attr:string)=>string} [p.titleOfAttr] 화면 열에 없는 값의 이름
 * @returns {Array<DataItem>} 이름 가나다순
 *
 * @typedef {object} DataItem
 * @property {string} id         항목 식별(대표 이름 + 첫 키 — 화면 안에서만 씀)
 * @property {string} name       대표 이름(가장 많이 쓰인 열 제목)
 * @property {string[]} titles   같은 항목의 다른 이름
 * @property {Array<{attr,screens:string[],titles:string[],lock:''|'reserved'|'generic'}>} keys 값 이름
 * @property {string[]} screens  이 항목이 보이는 화면 이름
 * @property {Array<{screen,title,attr}>} places 보이는 곳마다 — 화면 · 그 화면의 열 이름 · API 데이터 키(화면 순서)
 * @property {string[]} selectable 고를 수 있는 값 이름(예약어 · 공용 키 제외)
 */
export function buildDataItems({ screens = [], kinds = [], reserved = new Set(), titleOfAttr } = {}) {
  // 노드: 열(화면 × field) — 같은 제목 · 같은 field 로 잇습니다(union-find)
  const nodes = [];
  screens.forEach((x) => (x.rows || []).forEach((r) => {
    if (r.field) nodes.push({ screen: x.name, field: r.field, title: normTitle(r.title) });
  }));
  // 화면 열에 없지만 종류에 든 값도 항목으로 보입니다(종류 편집에서 넣은 값 · 서버 시드)
  const inScreens = new Set(nodes.map((n) => n.field));
  kinds.forEach((k) => (k.attrs || []).forEach((a) => {
    const attr = typeof a === 'string' ? a : a?.attrName;
    if (attr && !inScreens.has(attr)) {
      inScreens.add(attr);
      nodes.push({ screen: null, field: attr, title: normTitle(titleOfAttr ? titleOfAttr(k, attr) : attr) || attr });
    }
  }));

  const parent = nodes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; };
  const firstBy = new Map();
  nodes.forEach((n, i) => {
    // 공용 키 · 예약어는 잇지 않습니다 — 서로 다른 항목이 한 덩어리가 됩니다
    if (!GENERIC_ATTRS.has(n.field) && !reserved.has(n.field)) {
      const k = `f:${n.field}`;
      if (firstBy.has(k)) join(firstBy.get(k), i); else firstBy.set(k, i);
    }
    if (n.title && !SPLIT_TITLES.has(n.title)) {
      const k = `t:${n.title}`;
      if (firstBy.has(k)) join(firstBy.get(k), i); else firstBy.set(k, i);
    } else {
      // 이름으로 잇지 않는 제목은 「제목 + 값 이름」 이 같을 때만 잇습니다
      const k = `tf:${n.title}|${n.field}`;
      if (firstBy.has(k)) join(firstBy.get(k), i); else firstBy.set(k, i);
    }
  });

  const groups = new Map();
  nodes.forEach((n, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  });

  const items = [...groups.values()].map((list) => {
    const titleCnt = new Map();
    list.forEach((n) => titleCnt.set(n.title, (titleCnt.get(n.title) || 0) + 1));
    const titles = [...titleCnt.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0], 'ko')).map(([t]) => t);
    const byAttr = new Map();
    list.forEach((n) => {
      if (!byAttr.has(n.field)) {
        byAttr.set(n.field, {
          attr: n.field, screens: [], titles: [],
          lock: reserved.has(n.field) ? 'reserved' : GENERIC_ATTRS.has(n.field) ? 'generic' : '',
        });
      }
      const k = byAttr.get(n.field);
      if (n.screen && !k.screens.includes(n.screen)) k.screens.push(n.screen);
      if (!k.titles.includes(n.title)) k.titles.push(n.title);
    });
    const keys = [...byAttr.values()].sort((a, b) => (a.lock ? 1 : 0) - (b.lock ? 1 : 0) || b.screens.length - a.screens.length || a.attr.localeCompare(b.attr));
    const name = titles[0] || keys[0]?.attr || '';
    return {
      id: `${name}|${keys[0]?.attr || ''}`,
      name,
      titles: titles.slice(1),
      keys,
      screens: [...new Set(list.map((n) => n.screen).filter(Boolean))],
      places: list.filter((n) => n.screen).map((n) => ({ screen: n.screen, title: n.title, attr: n.field }))
        .filter((p, i, arr) => arr.findIndex((q) => q.screen === p.screen && q.title === p.title && q.attr === p.attr) === i),
      selectable: keys.filter((k) => !k.lock).map((k) => k.attr),
    };
  });

  // 같은 대표 이름이 둘 이상이면(이름으로 잇지 않은 제목) 값 이름을 붙여 구분합니다
  const nameCnt = new Map();
  items.forEach((it) => nameCnt.set(it.name, (nameCnt.get(it.name) || 0) + 1));
  items.forEach((it) => { if (nameCnt.get(it.name) > 1) it.name = `${it.name} (${it.keys[0]?.attr})`; });

  return items.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/**
 * 항목의 지금 가림 상태
 * @param {DataItem} item
 * @param {(attr:string)=>string} kindOf 값 이름 → 지금 종류 key('' = 가리지 않음)
 * @returns {{state:'none'|'all'|'partial'|'locked', kind:string, hidden:number, total:number}}
 *   partial = 고를 수 있는 키 중 일부만 가려지거나 서로 다른 종류에 들어 있음 — 「같은 항목이 화면마다 다르게 보이는」 상태
 */
export function itemState(item, kindOf) {
  const sel = item.selectable;
  if (!sel.length) return { state: 'locked', kind: '', hidden: 0, total: 0 };
  const ks = sel.map((a) => kindOf(a) || '');
  const hidden = ks.filter(Boolean).length;
  const uniq = [...new Set(ks)];
  if (!hidden) return { state: 'none', kind: '', hidden, total: sel.length };
  if (uniq.length === 1) return { state: 'all', kind: uniq[0], hidden, total: sel.length };
  return { state: 'partial', kind: '', hidden, total: sel.length };
}
