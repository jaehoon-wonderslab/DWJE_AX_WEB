/**
 * [Component] 설비별 불량률 표
 *
 * 설비가 1,300대를 넘어 목록으로는 볼 수 없어 매트릭스로 그리다가, 사용자 요청으로
 * **표(Tabulator)** 로 바꿨습니다. 정렬·열 폭 조절을 사람이 직접 다룰 수 있어야
 * "우리 공정 것만 골라 본다" 가 됩니다.
 *
 * 열 순서는 **설비 · 제품 · 불량률** 입니다. 공장 열은 걷어냈습니다 —
 * mes·ax 어디에도 공장 정보가 없어(2026-09-06 전수 확인) 빈 칸만 남았습니다.
 *
 * ■ 가동률이 아니라 불량률입니다
 * 가동률 수집값이 이 시스템에 없습니다(`uptimeRate` 가 전 설비 null).
 *
 * ■ 생산이 없는 설비는 뺍니다
 * 불량률 0% 로 두면 잘 돌아간 설비처럼 보입니다. 안 돌린 것과 잘 돌린 것은 다릅니다.
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { TabulatorGrid } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 불량률 구간별 색 — 아침회의 자료와 같은 기준선(3%)을 씁니다 */
function rateHtml(v) {
  const n = Number(v) || 0;
  const color = n >= 6 ? '#dc2626' : n >= 3 ? '#ea580c' : n >= 1 ? '#ca8a04' : '#64748b';
  return `<span class="strong num" style="color:${color}">${fixed(n, 2)}%</span>`;
}

const dash = (v) => (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : String(v));

export default function EquipmentMatrix({ data, loading }) {
  const s = useCommonStyles();
  const items = data?.items || [];

  const columns = useMemo(
    () => [
      { title: '설비', field: 'eqpt', widthGrow: 2, formatter: 'html' },
      { title: '제품', field: 'product', widthGrow: 2, formatter: 'html' },
      { title: '불량률', field: 'rate', width: 150, formatter: 'html', sorter: 'number', sorterParams: { alignEmptyValues: 'bottom' } },
    ],
    []
  );

  const rows = useMemo(
    () =>
      items.map((e) => ({
        eqpt: `${e.eqptNm}<span class="muted"> ${e.eqptCd}</span><div class="muted">${e.processNm}</div>`,
        product: dash(e.product ? `${e.product}${e.productEtcCnt ? ` 외 ${comma(e.productEtcCnt)}종` : ''}` : ''),
        rate: `${rateHtml(e.defectRate)}<div class="muted num">${comma(e.ngQty)} / ${comma(e.qty)} EA</div>`,
      })),
    [items]
  );

  if (loading && !items.length) return <Text style={s.textXs}>설비 현황을 불러오는 중입니다.</Text>;
  if (!items.length) return <Text style={s.textXs}>이 기간에 생산한 설비가 없습니다.</Text>;

  return (
    <View style={{ gap: 8 }}>
      {/*
        몇 대를 보고 있는지는 적어 둡니다 — 표에 다 있어도 "이게 전부인가" 를 알 수 있어야 합니다.
        생산이 없는 설비는 빠져 있으므로 그 사실도 함께 적습니다.
      */}
      <Text style={s.textXs}>{`생산한 설비 ${comma(items.length)}대 — 불량률이 높은 순입니다. 생산이 없는 설비는 뺐습니다.`}</Text>
      <TabulatorGrid columns={columns} rows={rows} height={items.length > 12 ? 520 : undefined} />
    </View>
  );
}
