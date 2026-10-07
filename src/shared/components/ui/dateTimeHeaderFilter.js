/**
 * 날짜·시각 머리글 필터 (Tabulator 열 정의에 펼쳐 넣습니다) — 2026-10-07
 *
 *   { title: '시각', field: 'ts', ...dateTimeHeaderFilter() }
 *
 * 입력칸에 글자를 직접 쳐도 되고(예: 「2026-10-07 11」), 오른쪽 달력 단추로 날짜와 시각을 골라도 됩니다.
 * 고르면 「YYYY-MM-DD HH:mm」 으로 입력칸에 들어갑니다. 값에 그 글자가 들어 있는 행을 남깁니다
 * (값은 「YYYY-MM-DD HH:mm:ss」 처럼 날짜가 앞에 오는 글자여야 합니다).
 *
 * 달력은 브라우저 기본 datetime-local 선택기를 씁니다. 숨긴 입력칸을 단추 밑에 두고 `showPicker()` 로 엽니다.
 */
const CAL_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

export function dateTimeHeaderFilter({ placeholder } = {}) {
  return {
    headerFilter: (cell, onRendered, success) => {
      const title = cell.getColumn().getDefinition().title || '시각';
      // Tabulator 가 돌려준 요소의 display 를 지웁니다 — 바깥 상자는 그대로 두고 안쪽 상자를 flex 로 둡니다
      const outer = document.createElement('div');
      const wrap = document.createElement('div');
      wrap.className = 'dw-dt-filter';
      wrap.style.cssText = 'position:relative;display:flex;align-items:center;gap:4px;';
      outer.append(wrap);

      const text = document.createElement('input');
      text.type = 'search';
      text.placeholder = placeholder || `${title} 검색`;
      text.setAttribute('aria-label', `${title} 검색`);
      // 표의 머리글 검색칸 공통 스타일(width:100%)을 덮어써야 달력 단추가 밀려나지 않습니다
      text.style.cssText = 'flex:1 1 auto;width:auto;min-width:0;';
      text.addEventListener('input', () => success(text.value));
      text.addEventListener('search', () => success(text.value));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dw-dt-filter-btn';
      btn.title = '달력에서 날짜 · 시각 선택';
      btn.setAttribute('aria-label', `${title} 달력에서 선택`);
      btn.innerHTML = CAL_ICON;
      btn.style.cssText = 'flex:none;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,0.12);border-radius:8px;background:transparent;color:inherit;cursor:pointer;padding:0;';

      // 선택기를 띄울 숨긴 칸 — 단추 자리에 겹쳐 두어 달력이 단추 밑에서 열립니다
      const picker = document.createElement('input');
      picker.type = 'datetime-local';
      picker.tabIndex = -1;
      picker.setAttribute('aria-hidden', 'true');
      picker.style.cssText = 'position:absolute;right:0;bottom:0;width:28px;height:28px;opacity:0;pointer-events:none;border:0;padding:0;';
      picker.addEventListener('change', () => {
        if (!picker.value) return;
        text.value = picker.value.replace('T', ' ');
        success(text.value);
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { picker.showPicker(); } catch { picker.focus(); }
      });

      wrap.append(text, btn, picker);
      return outer;
    },
    headerFilterFunc: (query, value) => {
      const q = String(query ?? '').trim();
      return !q || String(value ?? '').includes(q);
    },
    headerFilterLiveFilter: false,
  };
}

export default dateTimeHeaderFilter;
