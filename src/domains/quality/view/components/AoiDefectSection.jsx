/**
 * [View] 「불량 목록」 카드 — AOI 판정 분석 화면 (REQ_20260911 F-1·F-4·F-5·F-7·F-8)
 *
 * 한 행 = 한 시리얼의 판정 결과입니다. 카드는 화면 폭을 **한 행 전체**로 씁니다(요구 1).
 *  · 조회 조건은 **검사일 하루**만 — 설비(AOI)·LOT/모델 검색은 없앴습니다(요구 4·5).
 *  · 행을 누르면 **모달**이 열려 판정 정보와 NAS 사진을 크게 보여 줍니다(요구 7).
 *    화면에 붙어 있던 「불량 이미지」 카드는 없앴습니다(요구 8).
 *  · 실 설비명("VN-AOI PACKING KRIOS 4")이 길어 한 칸은 **두 줄까지만** 쓰고 둘째 줄은 …로 자릅니다.
 *  · 수량 3종은 `qty` 데이터 권한으로 가립니다. MSSQL(DIMENSION) 전환 후에는 검사 항목(SEQ) 기준 수치가 옵니다 —
 *    `sampleQty ?? seqCnt` · `ngQty ?? failSeqCnt` 로 양쪽 응답을 함께 읽습니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, DateField, Filters, Loading, Pagination, TabulatorGrid } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';

/** 표 높이 — 25행이 기본이라 스크롤로 봅니다 */
const LIST_HEIGHT = 460;

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
      // plant-wc-lot-serial(지금) · wc~eqpt~lot~serial(MSSQL 전환 후) — 길어서 두 줄까지 접힙니다
      { title: '불량 ID', field: 'defectId', minWidth: 150, widthGrow: 2, formatter: monoFmt },
      {
        title: '판정 일시',
        field: 'judgedAt',
        minWidth: 100,
        formatter: (cell) => {
          const [d, t] = String(dash(cell.getValue())).split(' ');
          return `<span class="mono nowrap">${esc(d)}</span>${t ? `<span class="muted mono nowrap">${esc(t)}</span>` : ''}`;
        },
      },
      {
        title: '작업장',
        field: 'processNm',
        minWidth: 104,
        widthGrow: 1,
        formatter: (cell) => {
          const d = cell.getData();
          const v = cell.getValue() || d.wcCd || d.processId;
          return `<span class="nowrap" title="${esc(v || '')}">${esc(dash(v))}</span>`;
        },
      },
      {
        title: '설비',
        field: 'eqptCd',
        minWidth: 118,
        widthGrow: 1,
        formatter: (cell) => {
          const d = cell.getData();
          return `<span class="nowrap" title="${esc(d.eqptNm || '')}">${esc(dash(cell.getValue()))}</span>${d.eqptNm ? `<span class="muted nowrap">${esc(d.eqptNm)}</span>` : ''}`;
        },
      },
      {
        title: 'LOT · 시리얼',
        field: 'lotNo',
        minWidth: 104,
        formatter: (cell) => `<span class="mono nowrap">${esc(dash(cell.getValue()))}</span>${cell.getData().serialNo ? `<span class="muted mono nowrap">${esc(cell.getData().serialNo)}</span>` : ''}`,
      },
      { title: '모델', field: 'model', minWidth: 66, formatter: (cell) => `<span class="nowrap">${esc(dash(cell.getValue()))}</span>` },
      { title: '검사', field: 'sampleQty', width: 74, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: qtyFmt((d) => d.sampleQty ?? d.seqCnt) },
      { title: '양품', field: 'okQty', width: 74, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: qtyFmt((d) => d.okQty) },
      {
        title: '불량',
        field: 'ngQty',
        width: 74,
        hozAlign: 'right',
        headerHozAlign: 'right',
        sorter: 'number',
        formatter: (cell) => {
          if (!canQty) return '<span class="muted">비공개</span>';
          const d = cell.getData();
          const v = Number(d.ngQty ?? d.failSeqCnt);
          return Number.isFinite(v) ? `<span class="num strong">${comma(v)}</span>` : '<span class="muted">—</span>';
        },
      },
      {
        title: '사진',
        field: 'imageCnt',
        width: 56,
        hozAlign: 'right',
        headerHozAlign: 'right',
        headerSort: false,
        formatter: (cell) => {
          const n = Number(cell.getValue()) || 0;
          return n ? `<span class="num">${n}장</span>` : '<span class="muted">—</span>';
        },
      },
    ];
  }, [canQty]);

  const total = meta?.total ?? items.length;
  const firstLoad = loading && !items.length;

  return (
    <View>
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
            <style>{`
              #aoiDefectGrid .tabulator { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; border-top: 0 !important; }
              #aoiDefectGrid .tabulator .tabulator-row:hover { background: ${theme.alpha('primary', 0.05)} !important; }
            `}</style>
            <TabulatorGrid
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
