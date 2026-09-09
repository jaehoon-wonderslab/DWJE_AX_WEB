import './_rnw';
import React from 'react';
import { BlindValue } from 'dwje-ax-web';

const KV = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid #DFE1E7' }}>
    <span style={{ width: 96, fontSize: 12, fontWeight: 500, color: '#787878' }}>{k}</span>
    <div style={{ flex: 1, display: 'flex', fontSize: 12.5, fontWeight: 500, color: '#0B1440' }}>{children}</div>
  </div>
);

/** 권한이 있는 값(또는 field 없음) — 값 문자열을 그대로 그립니다 */
export const Visible = () => (
  <div style={{ width: 260, fontSize: 12.5, fontWeight: 500, color: '#0B1440' }}>
    <BlindValue value="12,400원" />
  </div>
);

/** 데이터 접근 권한이 없는 항목 — 값 대신 ●●●● 비공개 배지(값은 렌더하지 않음) */
export const Masked = () => (
  <div style={{ width: 260, display: 'flex' }}>
    <BlindValue field="price" value="12,400원" />
  </div>
);

/** 상세 표 안에서 — 허용된 항목은 값, 막힌 항목(단가·고객사·작업자)은 배지 */
export const InDetail = () => (
  <div style={{ width: 300 }}>
    <KV k="LOT"><BlindValue value="L260909-0412" /></KV>
    <KV k="모델"><BlindValue value="Krios_s" /></KV>
    <KV k="품목 단가"><BlindValue field="price" value="12,400원" /></KV>
    <KV k="고객사"><BlindValue field="customer" value="(주)한빛전자" /></KV>
    <KV k="작업자"><BlindValue field="worker" value="이재훈 (2019034)" /></KV>
  </div>
);

/** textStyle · numberOfLines — 표 셀처럼 한 줄로 자르고 굵기를 바꿉니다 */
export const Styled = () => (
  <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <BlindValue value="128,400 EA" textStyle={{ fontSize: 18, fontWeight: '600', color: '#0B1440', letterSpacing: -0.36 }} />
    <BlindValue
      value="금형 교체 후 첫 로트. 치수 편차 모니터링 중이며 다음 로트에서 재판정 예정."
      numberOfLines={1}
      textStyle={{ fontSize: 12, fontWeight: '500', color: '#3C3C3C' }}
    />
  </div>
);
