import './_rnw';
import React from 'react';
import { XlsLegend, XlsTable } from 'dwje-ax-web';

/** 표 아래 색 범례 — tone ok/warn/bad 의 8px 사각 점 + 라벨 */
export const Basic = () => (
  <div style={{ display: 'flex' }}>
    <XlsLegend items={[{ tone: 'ok', label: '정상 (목표 달성)' }, { tone: 'warn', label: '주의 (목표 -3% 이내)' }, { tone: 'bad', label: '위험 (목표 미달)' }]} />
  </div>
);

/** 표와 함께 — XlsTable 바로 아래에 붙여 셀 색의 뜻을 설명합니다 */
export const WithTable = () => (
  <div style={{ width: 300 }}>
    <XlsTable
      columns={[
        { key: 'eq', title: '설비', width: 90, align: 'left' },
        { key: 'rate', title: '불량률', width: 100 },
        { key: 'up', title: '가동률', width: 100 },
      ]}
      rows={[
        { cells: [{ v: 'PR-01', align: 'left' }, { v: '1.5%', tone: 'ok' }, { v: '94.2%', tone: 'ok' }] },
        { cells: [{ v: 'PR-02', align: 'left' }, { v: '2.1%', tone: 'warn' }, { v: '91.8%', tone: 'warn' }] },
        { cells: [{ v: 'PR-03', align: 'left' }, { v: '4.0%', tone: 'bad' }, { v: '88.5%', tone: 'bad' }] },
      ]}
    />
    <XlsLegend items={[{ tone: 'ok', label: '정상' }, { tone: 'warn', label: '주의' }, { tone: 'bad', label: '위험' }]} />
  </div>
);
