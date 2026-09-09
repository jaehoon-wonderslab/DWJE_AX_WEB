import './_rnw';
import React from 'react';
import { BlindNote, BlindValue } from 'dwje-ax-web';

/** 막힌 항목 2개 — 항목명을 · 로 이어 한 줄 안내 */
export const Basic = () => (
  <div style={{ width: 300 }}>
    <BlindNote fields={['price', 'customer']} />
  </div>
);

/** 막힌 항목 1개 */
export const Single = () => (
  <div style={{ width: 300 }}>
    <BlindNote fields={['worker']} />
  </div>
);

/** 표 하단 — 비공개 셀이 있는 표 아래에 근거 문구처럼 붙입니다 */
export const UnderTable = () => (
  <div style={{ width: 300 }}>
    <div style={{ borderTop: '1px solid #DFE1E7' }}>
      {[
        ['PRESS', 'PR-03', '2,400'],
        ['Plating', 'PL-01', '1,920'],
      ].map(([proc, eq, qty]) => (
        <div key={eq} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #DFE1E7', fontSize: 12, fontWeight: 500, color: '#0B1440' }}>
          <span style={{ width: 56 }}>{proc}</span>
          <span style={{ width: 48 }}>{eq}</span>
          <span style={{ width: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{qty}</span>
          <BlindValue field="price" value="12,400원" />
        </div>
      ))}
    </div>
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #DFE1E7' }}>
      <BlindNote fields={['qty', 'price']} />
    </div>
  </div>
);
