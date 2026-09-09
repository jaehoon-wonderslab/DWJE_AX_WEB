import './_rnw';
import React from 'react';
import { ReportDoc, ReportTitle, SignalLegend, Dot } from 'dwje-ax-web';

const rows: Array<[string, string, string, string, '' | 'amber' | 'red']> = [
  ['PRESS', '52,000', '50,120', '96.4%', ''],
  ['Plating', '48,000', '44,900', '93.5%', 'amber'],
  ['Coating', '40,000', '39,600', '99.0%', ''],
  ['AOI', '40,000', '33,400', '83.5%', 'red'],
];

const th: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#787878', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #DFE1E7' };
const td: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: '#0B1440', padding: '9px 10px', borderBottom: '1px solid #EEF0F3' };
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/** 아침회의 자료 — 날짜 박스 · 제목 · 신호등 범례 · 공정별 달성률 표 */
export const MorningReport = () => (
  <div style={{ width: 760 }}>
    <ReportDoc nodeId="report-morning">
      <ReportTitle dateBox="09.09 (화)" title="아침회의 자료 — 전일 생산 실적" right={<SignalLegend />} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th style={th}>공정</th><th style={{ ...th, textAlign: 'right' }}>계획</th><th style={{ ...th, textAlign: 'right' }}>실적</th><th style={{ ...th, textAlign: 'right' }}>달성률</th><th style={{ ...th, width: 40 }}>신호</th></tr>
        </thead>
        <tbody>
          {rows.map(([p, plan, act, rate, tone]) => (
            <tr key={p}>
              <td style={td}>{p}</td><td style={num}>{plan}</td><td style={num}>{act}</td><td style={num}>{rate}</td>
              <td style={{ ...td, textAlign: 'center' }}>{tone === '' ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: '#2E9E6B' }} /> : <Dot tone={tone} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, fontSize: 10.5, lineHeight: '16px', color: '#787878' }}>출처: MES 실적 집계 2026-09-09 06:00 · 신호등은 달성률 기준(95% 이상 / 95% 미만 / 85% 미만)</div>
    </ReportDoc>
  </div>
);

/** 빈 틀 — 흰 패널 · 헤어라인 · 16px 반지름 · 20px 여백. nodeId 로 인쇄 영역을 찾습니다 */
export const Frame = () => (
  <div style={{ width: 760 }}>
    <ReportDoc nodeId="report-weekly">
      <ReportTitle title="주간 품질 보고 (9/1~9/7)" />
      <div style={{ fontSize: 12.5, lineHeight: '19px', color: '#3C3C3C' }}>
        주간 종합 수율 97.1% (전주 96.8%). Plating 두께 하한 이탈 3건은 PL-01 전류 밀도 보정으로 종결. AOI 오판정률은 1.2% → 0.9% 로 개선.
      </div>
    </ReportDoc>
  </div>
);
