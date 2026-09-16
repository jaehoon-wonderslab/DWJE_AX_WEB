/**
 * [View] 「불량 목록」 카드 — AOI 판정 분석 화면 (REQ_20260911 F-1·F-4·F-5·F-7·F-8)
 *
 * 한 행 = 한 시리얼의 판정 결과입니다. 카드는 화면 폭을 **한 행 전체**로 씁니다(요구 1).
 *  · 조회 조건은 **검사일 하루**만 — 설비(AOI)·LOT/모델 검색은 없앴습니다(요구 4·5).
 *  · 행을 누르면 **모달**이 열려 판정 정보와 NAS 사진을 크게 보여 줍니다(요구 7).
 *    화면에 붙어 있던 「불량 이미지」 카드는 없앴습니다(요구 8).
 *  · 실 설비명("VN-AOI PACKING KRIOS 4")이 길어 한 칸은 **두 줄까지만** 쓰고 둘째 줄은 …로 자릅니다.
 *  · 수량은 `qty` 데이터 권한으로 가립니다. MSSQL(DIMENSION) 전환 후에는 검사 회차(SEQ) 기준 수치가 옵니다 —
 *    `sampleQty ?? seqCnt` · `ngQty ?? failSeqCnt` 로 양쪽 응답을 함께 읽습니다.
 *
 * 2026-09-11 MSSQL 실측 반영 (docs/requests/REQ_20260911_aoi_dimension_mssql_실측.md)
 *  · 「불량률」 열을 둡니다 — DIMENSION 규칙(SEQ 중 하나라도 PASSED=0 이면 불량)으로는 시리얼이 **거의 전부 불량**이라
 *    합부만으로는 줄을 세울 수 없습니다. 실제로 2026-09-11 은 시리얼 70개가 모두 불량이었고 SEQ 불량률은 24.7% 였습니다.
 *  · 「판정」은 배지로 두되 정렬 기본은 불량률입니다.
 *  · 시리얼이 날짜를 가로지르면(`partial`·`seqMin>1`) 시리얼 칸에 「이어짐」을 답니다 — 그 날짜 구간만 보고 있다는 뜻입니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, DateField, Filters, Loading, Pagination, TabulatorGrid } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { failSeqText } from '../../model/failSeqText';

/** 표 높이 — 25행이 기본이라 스크롤로 봅니다 */
const LIST_HEIGHT = 460;

/** 불량 건수 — MES(ngQty) 와 DIMENSION(failSeqCnt) 양쪽을 읽습니다 */
const ngOf = (d) => {
  const v = Number(d.ngQty ?? d.failSeqCnt);
  return Number.isFinite(v) ? v : null;
};

/** 불량률(%) — 서버가 주면 그대로, 없으면 불량/검사 로 계산합니다 */
const rateOf = (d) => {
  const given = Number(d.failRate);
  if (Number.isFinite(given)) return given;
  const ng = ngOf(d);
  const all = Number(d.sampleQty ?? d.seqCnt);
  if (ng === null || !Number.isFinite(all) || all <= 0) return null;
  return (ng / all) * 100;
};

/**
 * 조회 조건 — 화면 **맨 위**에 놓습니다.
 *
 * 예전에는 「불량 목록」 카드 바로 위에 있었는데, 그 위로 분석 카드가 올라오면서
 * 조회 조건이 화면 중간에 끼어 무엇을 바꾸는 조건인지 알기 어려워졌습니다.
 * 조건은 이 화면 전체(분석·목록·추이)에 걸리므로 맨 앞에 있어야 합니다.
 */
export function AoiDateFilter({ date, setDate, search, applied, autoBackedTo }) {
  const s = useCommonStyles();
  return (
    <Filters>
      <DateField label="검사일" value={date} onChange={setDate} />
      <Button label="조회" variant="primary" onPress={search} />
      <View style={{ justifyContent: 'flex-end', paddingBottom: 9 }}>
        <Text style={s.caption}>
          {autoBackedTo
            ? `${autoBackedTo} 에는 AOI 판정이 없어 최근 판정일(${applied})을 열었습니다`
            : '하루치만 조회합니다 — 검사 항목(SEQ)이 많아 기간 조회는 무겁습니다'}
        </Text>
      </View>
    </Filters>
  );
}

export default function AoiDefectSection({
  loading, items, meta, paging, pageSizes,
  date, setDate, applied, search, autoBackedTo,
  /** 행을 눌렀을 때 — 화면이 모달을 엽니다 */
  onRowSelect,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);
  const canQty = canData('qty');

  const columns = useMemo(() => {
    const qtyFmt = (pick) => (cell) => {
      if (!canQty) return '<span class="muted">비공개</span>';
      const v = pick(cell.getData());
      return v === null || v === undefined ? '<span class="muted">—</span>' : `<span class="num">${comma(v)}</span>`;
    };
    return [
      // ── 원천 컬럼을 그대로 한 칸씩 ──────────────────────────────────────
      // 묶어서 보여 주지 않습니다. `wc~eqpt~lot~serial` 한 덩어리(시리얼 키)와 `firstAt ~ lastAt` 묶음을
      // 걷어내고 원천(TB_SAMSUN_DIMENSION)의 열을 항목별로 폅니다. 원천에 없는 값(모델·등급 등)은 두지 않습니다.
      { title: '작업장', field: 'wcCd', minWidth: 88, formatter: monoFmt },
      { title: '설비', field: 'eqptCd', minWidth: 96, formatter: monoFmt },
      { title: 'LOT', field: 'lotNo', minWidth: 104, formatter: monoFmt },
      {
        title: '시리얼',
        field: 'serialNo',
        minWidth: 96,
        formatter: (cell) => {
          // 시리얼이 날짜를 가로지르면 그 날짜 구간만 보고 있다는 뜻입니다 (MSSQL 실측 A-4)
          const d = cell.getData();
          const carried = d.partial === true || Number(d.seqMin) > 1;
          return `<span class="mono nowrap">${esc(dash(cell.getValue()))}</span>${carried ? '<span class="muted nowrap">이어짐</span>' : ''}`;
        },
      },
      // COMMENT 의 뜻(호기·지그)은 아직 확인되지 않았습니다 — 원천 컬럼명을 그대로 답니다
      { title: 'COMMENT', field: 'cavity', minWidth: 96, formatter: (cell) => `<span class="nowrap">${esc(dash(cell.getValue()))}</span>` },
      { title: '첫 측정', field: 'firstAt', minWidth: 132, formatter: dtFmt },
      { title: '마지막 측정', field: 'lastAt', minWidth: 132, formatter: dtFmt },
      // SEQ 범위는 **조회일 구간**입니다(검사 회차·불량 회차는 시리얼 전체). 자정을 넘긴 시리얼에서 둘이 달라집니다
      { title: 'SEQ 시작 (조회일)', field: 'seqMin', width: 116, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: numFmt },
      { title: 'SEQ 끝 (조회일)', field: 'seqMax', width: 116, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: numFmt },
      { title: '검사 회차', field: 'seqCnt', width: 96, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: qtyFmt((d) => d.seqCnt) },

      {
        title: '불량 회차',
        field: 'failSeqCnt',
        width: 96,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        formatter: (cell) => {
          if (!canQty) return '<span class="muted">비공개</span>';
          const v = ngOf(cell.getData());
          return v === null ? '<span class="muted">—</span>' : `<span class="num strong">${comma(v)}</span>`;
        },
      },
      {
        // DIMENSION 에서 가장 중요한 열입니다 — 합부만으로는 시리얼이 거의 전부 불량이라 줄이 서지 않습니다
        title: '불량률',
        field: 'failRate',
        width: 100,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: (a, b, aRow, bRow) => (rateOf(aRow.getData()) ?? -1) - (rateOf(bRow.getData()) ?? -1),
        formatter: (cell) => {
          if (!canQty) return '<span class="muted">비공개</span>';
          const r = rateOf(cell.getData());
          if (r === null) return '<span class="muted">—</span>';
          const tone = r >= 30 ? 'red' : r >= 10 ? 'amber' : 'green';
          return `<span class="tag tag-${tone}">${r.toFixed(1)}%</span>`;
        },
      },
      {
        title: '판정',
        field: 'passed',
        width: 68,
        hozAlign: 'center',
        headerHozAlign: 'center',
        formatter: (cell) => {
          const d = cell.getData();
          const ng = ngOf(d);
          // passed 가 오면 그대로, 없으면 불량 SEQ 수로 판단합니다 (하나라도 있으면 불량)
          const bad = d.passed === false || d.passed === 0 || (d.passed === undefined && ng !== null && ng > 0);
          if (d.passed === undefined && ng === null) return '<span class="muted">—</span>';
          return bad ? '<span class="tag tag-red">불량</span>' : '<span class="tag tag-green">양품</span>';
        },
      },
      {
        // 7번 요청 — 몇 번째 회차에서 걸렸는지 목록에서 바로 보이게.
        // 서버가 앞 20개만 주고(failSeqsTop) 잘렸는지는 failSeqsTruncated 로 알려 줍니다.
        title: '불량 회차 번호',
        field: 'failSeqs',
        minWidth: 180,
        widthGrow: 2,
        headerSort: false,
        formatter: (cell) => {
          const d = cell.getData();
          const list = cell.getValue();
          if (!Array.isArray(list) || !list.length) return '<span class="muted">—</span>';
          return `<span class="mono">${esc(failSeqText(list, d.failSeqCnt))}</span>`;
        },
      },
    ];
  }, [canQty]);

  const total = meta?.total ?? items.length;
  const firstLoad = loading && !items.length;

  return (
    <View>
      <Card
        title="불량 목록"
        sub={`${applied} 판정 · 행을 누르면 판정 정보와 NAS 사진을 크게 봅니다 · 검사 항목 중 하나라도 불량이면 그 시리얼은 불량입니다`}
        tight
        right={<Badge>{`${comma(total)}건`}</Badge>}
      >
        {firstLoad ? (
          <Loading compact />
        ) : (
          <View nativeID="aoiDefectGrid">
            {/* 표는 카드 안쪽 여백을 두고 제 테두리를 그대로 씁니다 — 호버 색만 덧입힙니다 */}
            <style>{`
              #aoiDefectGrid .tabulator .tabulator-row:hover { background: ${theme.alpha('primary', 0.05)} !important; }
            `}</style>
            <TabulatorGrid
              inset
              columns={columns}
              rows={items}
              height={items.length > 8 ? LIST_HEIGHT : undefined}
              headerFilter={false}
              onRowClick={(row) => onRowSelect?.(row)}
              emptyText={`${applied} 에 조회된 AOI 판정 이력이 없습니다.`}
            />
          </View>
        )}
        <Pagination meta={meta} {...paging.bind} sizes={pageSizes} />
      </Card>
    </View>
  );
}

/* ───────── Tabulator 셀 HTML 도우미 — 서버 문자열은 이스케이프해서 넣습니다 ───────── */

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
const monoFmt = (cell) => `<span class="mono">${esc(dash(cell.getValue()))}</span>`;

/** 날짜·시각 — 한 칸 안에서 날짜와 시각이 붙어 읽히지 않게 사이를 띄웁니다 */
const dtFmt = (cell) => {
  const v = cell.getValue();
  if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
  const [day, time] = String(v).split(' ');
  return `<span class="mono nowrap">${esc(day)}</span><span class="muted mono nowrap">${esc(time || '')}</span>`;
};

/** 셈이 아닌 번호(SEQ) — 자릿수만 맞춥니다 */
const numFmt = (cell) => {
  const v = cell.getValue();
  return v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : `<span class="num">${comma(v)}</span>`;
};
