import './_rnw';
import React, { useEffect } from 'react';
import { DrawerHost, useUiStore, KeyValue, StateBadge, Badge, Hint, ProgressBar, SourceNote } from 'dwje-ax-web';

/**
 * 드로어는 App 최상위의 <DrawerHost /> 한 개가 그립니다(오른쪽에서 400px 패널).
 * 화면에서는 `useUiStore.getState().openDrawer({ title, sub, render(close) })` 로 열고 `closeDrawer()` 로 닫습니다.
 * 미리보기는 마운트 때 열고 언마운트 때 닫습니다.
 */
const Stage = ({ config }: { config: { title: string; sub?: string; render: React.ReactNode | ((close: () => void) => React.ReactNode) } }) => {
  useEffect(() => {
    useUiStore.getState().openDrawer(config);
    return () => useUiStore.getState().closeDrawer();
  }, []);
  return (
    <div style={{ width: 860, height: 620, background: '#F4F5F6', borderRadius: 24 }}>
      <DrawerHost />
    </div>
  );
};

/** 설비 상세 — 목록 행을 누르면 오른쪽에서 열리는 상세 패널 */
export const EquipDetail = () => (
  <Stage
    config={{
      title: 'PR-03',
      sub: 'PRESS · 1라인 · Krios_s',
      render: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <KeyValue
            keyWidth={96}
            rows={[
              ['상태', <StateBadge state="가동" />],
              ['금일 생산', '31,200 EA'],
              ['불량률', '1.8% (전일 1.4%)'],
              ['금형 교체', '2026-09-09 08:12'],
              ['담당', '이재훈 (생산1팀)'],
            ]}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ fontSize: 11, fontWeight: 500, color: '#787878' }}>계획 대비 진척 96.2%</div><ProgressBar percent={96.2} /></div>
          <Hint icon="alert">교체 이후 치수 불량이 3건 집중되었습니다. 하중 편차를 확인하세요.</Hint>
          <SourceNote>근거: MES 설비 이벤트 · AOI 판정 로그(09:55)</SourceNote>
        </div>
      ),
    }}
  />
);

/** 알림 상세 — 배지·설명 문단이 든 읽기 전용 패널 */
export const AlertDetail = () => (
  <Stage
    config={{
      title: 'PL-01 도금 두께 하한 근접',
      sub: '이상 알림 · 09:40',
      render: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Badge tone="amber">주의</Badge>
            <Badge tone="blue">진행 중</Badge>
            <Badge>Plating</Badge>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: '20px', color: '#3C3C3C', fontWeight: 500 }}>
            최근 5개 LOT 의 도금 두께 평균이 12.2 µm 로 하한(12.0 µm)에 근접했습니다. 전해액 농도 저하가 의심되며, 다음 교대 전 농도 측정을 권장합니다.
          </div>
          <KeyValue keyWidth={96} rows={[['영향 LOT', 'L260909-0410 ~ 0414'], ['예상 손실', '약 120 EA'], ['담당', '박민수 (생산2팀)']]} />
        </div>
      ),
    }}
  />
);
