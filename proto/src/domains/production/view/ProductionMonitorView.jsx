/**
 * [View] PR-01 생산 모니터링 (경로: /production/monitor)
 *
 * IoT 복합 센서가 부착된 프레스 10대와 AOI 검사기 10대의 진행 현황을 실시간으로 조회합니다.
 * 사용 API 2건 — /api/v1/production/monitor/*
 */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, DateField, Filters } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { makePressTopView, pressSummary } from '../model/pressTopViewModel';
import PressTopView from './components/PressTopView';

/** 갱신 시각 표기 (초까지 — 10초 폴링이라 분 단위로는 움직임이 안 보입니다) */
const hhmmss = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

export default function ProductionMonitorView({
  filters, setTargetDate, items,
  autoRefresh, toggleAutoRefresh, search, exportExcel,
  updatedAt }) {
  const s = useCommonStyles();
  const [selectedPress, setSelectedPress] = useState(null);
  const presses = useMemo(() => makePressTopView(items), [items]);
  const topSummary = useMemo(() => pressSummary(presses), [presses]);

  // 전체 대수는 응답에 없으면 가동·경고·비가동 합으로 셉니다 (박아 둔 숫자는 실제 설비 수와 다릅니다)
  return (
    <View>
      <PageHead
        title="생산 모니터링"
        desc={`${filters.targetDate} 00:00 ~ 익일 00:00 · 전체 설비 10대 · 가동 ${topSummary.RUNNING} · 주의 ${topSummary.WARNING} · 정지 ${topSummary.STOPPED} · 점검 ${topSummary.MAINTENANCE}`}
        actions={
          <>
            {/* 값이 전부 0 일 때 화면이 살아 있는지 알려면 갱신 시각이 보여야 합니다 */}
            {updatedAt ? <Text style={[s.textXs, { alignSelf: 'center', marginRight: 2 }]}>{`${hhmmss(updatedAt)} 갱신`}</Text> : null}
            <Button
              label={autoRefresh ? '실시간 갱신 중 · 10초' : '자동 새로고침 꺼짐'}
              size="sm"
              variant={autoRefresh ? 'primary' : undefined}
              icon="refresh"
              onPress={toggleAutoRefresh}
            />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
          </>
        }
      />

      <Filters>
        <DateField label="기준일" value={filters.targetDate} onChange={setTargetDate} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card title="공장 레이아웃" sub="설비를 선택해 실시간 생산 정보를 확인하세요.">
        <PressTopView presses={presses} selectedId={selectedPress} onSelect={setSelectedPress} />
      </Card>
    </View>
  );
}
