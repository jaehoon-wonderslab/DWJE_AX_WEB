import './_rnw';
import React from 'react';
import { Grid, StatCard } from 'dwje-ax-web';

const Box = ({ children, h = 64 }: { children: React.ReactNode; h?: number }) => (
  <div style={{ height: h, borderRadius: 12, background: '#FAFAFA', border: '1px solid #DFE1E7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#0B1440' }}>
    {children}
  </div>
);

/** cols={2} — 창이 1100px 보다 좁으면 1열로 접힙니다 */
export const Cols2 = () => (
  <div style={{ width: 760 }}>
    <Grid cols={2}>
      <Box>공정별 수율</Box>
      <Box>불량 유형 Pareto</Box>
    </Grid>
  </div>
);

/** cols={3} — 기본값. 좁은 창에서는 1열 */
export const Cols3 = () => (
  <div style={{ width: 760 }}>
    <Grid>
      <Box>PRESS</Box>
      <Box>Plating</Box>
      <Box>Coating</Box>
    </Grid>
  </div>
);

/** cols={4} — KPI 줄. 1100px 미만은 2열, 860px 미만은 1열 */
export const Cols4 = () => (
  <div style={{ width: 760 }}>
    <Grid cols={4}>
      <StatCard label="금일 생산량" value="128,400" unit="EA" sub="계획 대비 96.2%" tone="up" />
      <StatCard label="종합 수율" value="97.4" unit="%" sub="목표 97.0% 달성" tone="up" />
      <StatCard label="PRESS 불량률" value="1.8" unit="%" sub="전일 대비 +0.4%p" tone="down" />
      <StatCard label="가동 설비" value="42" unit="/ 48" sub="점검 중 3 · 비가동 3" />
    </Grid>
  </div>
);

/** cols={[2, 1]} — 비율 두 칸(차트 + 사이드). 마지막 줄이 덜 차면 빈 칸으로 폭을 맞춥니다 */
export const Ratio = () => (
  <div style={{ width: 760 }}>
    <Grid cols={[2, 1]}>
      <Box h={96}>불량률 추이 (2/3)</Box>
      <Box h={96}>이상 알림 (1/3)</Box>
    </Grid>
    <div style={{ height: 14 }} />
    <Grid cols={3}>
      <Box>PRESS</Box>
      <Box>Plating</Box>
    </Grid>
  </div>
);
