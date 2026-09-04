/**
 * [View] RP-01 아침회의 자료 (PRESS) (경로: /report/press-morning)
 *
 * 「생산관리팀 (PRESS)_아침회의자료」 양식 그대로입니다 — 표 정의는 `components/MorningSheet` 에 있고
 * Plating·Coating 자료와 같은 것을 씁니다. 화면과 엑셀이 갈라지지 않게 열 정의를 한 곳에 둡니다.
 *
 * 신호등 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험 (서버 state: NORMAL | WARN | CRIT)
 * 값이 없는 칸은 스크린샷대로 `-` 로 둡니다.
 */
import React from 'react';
import { View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, DateField, EmptyState, Filters, Loading, SelectField } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { downloadCsv, downloadXls, printDocument } from '@shared/utils/exportUtil';
import MorningSheet, { MORNING_HEAD, morningExportRows } from './components/MorningSheet';

const NODE_ID = 'rpt-press-morning-doc';
const TITLE = '아침회의 자료 (PRESS)';

export default function PressMorningView({
  loading, data, role, filters, processOptions = [], stateOptions = [],
  setBaseDate, setProcessScope, setState, search,
}) {
  const canData = useAuthStore((state) => state.canData);

  const report = data?.report;
  const rows = report?.rows || [];
  const baseDate = report?.baseDate || filters.baseDate;

  let blindCnt = 0;
  const mask = (field, v) => {
    if (canData(field)) return v;
    blindCnt += 1;
    return '비공개';
  };

  const exportRows = morningExportRows(rows, mask);
  const fileName = `아침회의자료_PRESS_${String(baseDate || '').replace(/-/g, '')}`;

  return (
    <View>
      <PageHead
        title={TITLE}
        desc={`기준일 ${filters.baseDate} · Press 공정별 일목표 대비 실적과 주간 누적 달성률을 신호등으로 점검하는 아침회의 요약표입니다.`}
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: TITLE, role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: fileName, head: MORNING_HEAD, rows: exportRows, blindCount: blindCnt })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" variant="primary" onPress={() => downloadXls({ name: fileName, head: MORNING_HEAD, rows: exportRows, blindCount: blindCnt })} />
          </>
        }
      />

      <Filters>
        <DateField label="기준일" value={filters.baseDate} onChange={setBaseDate} />
        <SelectField label="공정" value={filters.processScope} options={processOptions} onChange={setProcessScope} />
        <SelectField label="상태" value={filters.state} options={stateOptions} onChange={setState} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : !rows.length ? (
        // 조회 결과가 없어도 조회 조건은 그대로 두어 기준일·공정을 바꿀 수 있게 합니다
        <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />
      ) : (
        <MorningSheet
          nodeId={NODE_ID}
          title="생산관리팀 (PRESS)"
          baseDate={baseDate}
          resultDate={baseDate}
          rows={rows}
          mask={mask}
          note="일목표·실적은 MES 실적과 불량 이력에서 자동 집계됩니다. 결정항목·DRI·기한은 아침회의에서 확정합니다."
        />
      )}
    </View>
  );
}
