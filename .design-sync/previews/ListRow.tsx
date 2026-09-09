import './_rnw';
import React from 'react';
import { ListRow, Badge } from 'dwje-ax-web';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 320, background: '#FFFFFF', border: '1px solid #DFE1E7', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
);

/** 알림 목록 — 상태 점 · 제목 · 설명 · 시각, 마지막 줄은 last 로 밑줄 제거 */
export const Alerts = () => (
  <Panel>
    <ListRow tone="red" title="PR-03 하중 편차 상한 초과" desc="PRESS · 3회 연속 · 자동 정지" time="08:12" />
    <ListRow tone="amber" title="PL-01 도금 두께 하한 근접" desc="Plating · 12.1 µm (하한 12.0)" time="09:40" />
    <ListRow tone="" title="AOI 오판정 의심 12건" desc="Krios_s · LOT L260909-0412" time="10:05" />
    <ListRow tone="gray" title="CT-02 정기 점검 시작" desc="Coating · 예정 종료 14:00" time="10:30" last />
  </Panel>
);

/** right 슬롯 — 시각 앞에 배지·건수를 둡니다 */
export const WithRight = () => (
  <Panel>
    <ListRow tone="red" title="긴급 알림" desc="미확인 1건" right={<Badge tone="red">긴급</Badge>} time="08:12" />
    <ListRow tone="amber" title="주의 알림" desc="미확인 3건" right={<Badge tone="amber">주의</Badge>} time="09:40" />
    <ListRow title="AI 브리핑 생성 완료" desc="09:00 기준 · 근거 3건" right={<Badge tone="green">완료</Badge>} time="09:02" last />
  </Panel>
);

/** 점·시각 없이 — 제목과 설명만 있는 단순 목록 */
export const Plain = () => (
  <Panel>
    <ListRow title="금형 교체 이력" desc="PR-03 · 2026-09-09 07:50 · 이재훈" />
    <ListRow title="설비 파라미터 변경" desc="PL-01 · 전류 12.4 → 12.8 A" />
    <ListRow title="검사 기준 개정" desc="AOI · Krios_s 치수 허용치 ±0.02" last />
  </Panel>
);

/** 클릭 가능 — onPress 를 주면 터치 영역(TouchableOpacity)이 됩니다 */
export const Pressable = () => (
  <Panel>
    <ListRow tone="amber" title="PL-01 도금 두께 하한 근접" desc="눌러서 상세 보기" time="09:40" onPress={() => {}} last />
  </Panel>
);
