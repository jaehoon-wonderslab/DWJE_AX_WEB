/**
 * [View] SY-09 보안 감사 로그 (경로: /system/audit-log)
 *
 * 보안 필터링 처리 이력, 사용자 접속 이력, 데이터 접근 이력을 통합 관리합니다.
 * 사용 API 1건 — /api/v1/audit-logs
 */
import React from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, Loading, Pagination, SelectField, Table } from '@shared/components/ui';
import { withAll } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';

/**
 * 유형 배지 색 규칙 — 해제 요청은 주황, 마스킹 처리는 기본(회색), 그 외(원본 조회·권한 변경·로그인·자동 생성)는 파랑.
 * 서버는 코드(UNMASK_REQ · MASK …)로 주고, 예전 목 응답은 표시명으로 주므로 둘 다 받습니다.
 */
function typeTone(type, label) {
  if (type === 'UNMASK_REQ' || String(label).includes('해제')) return 'amber';
  if (type === 'MASK' || String(label).includes('마스킹')) return '';
  return 'blue';
}

/** 처리 결과 색 — blind 처리는 주황, 반려는 빨강, 허용은 기본 */
function resultTone(result) {
  if (result === 'BLIND') return 'amber';
  if (result === 'REJECT') return 'red';
  return '';
}

export default function AuditLogView({
  paging, itemsMeta,
  loading, items, filters, deptOptions, typeCodes = [], typeLabel, resultLabel, setFrom, setTo, setType, setGroup, reload, exportExcel,
}) {
  const s = useCommonStyles();
  const total = itemsMeta?.total ?? items.length;

  return (
    <View>
      <PageHead
        title="보안 감사 로그"
        desc="보안 필터링 처리 이력, 사용자 접속 이력, 데이터 접근 이력을 통합 관리합니다. 권한 변경·마스킹·출력·모델 전환은 자동으로 기록됩니다."
        actions={
          <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="유형" value={filters.type} options={withAll(typeCodes)} onChange={setType} />
        <SelectField label="사용자 그룹" value={filters.group} options={deptOptions} onChange={setGroup} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="감사 로그" sub={`${comma(total)}건 · 오늘 기준 조회`} tight>
        {loading ? (
          <Loading />
        ) : (
          <Table
            minWidth={900}
            keyExtractor={(r, i) => `${r.ts}-${i}`}
            emptyText="조회 조건에 맞는 감사 기록이 없습니다."
            columns={[
              { key: 'ts', title: '시각', width: 140, mono: true },
              {
                key: 'type',
                title: '유형',
                width: 140,
                render: (r) => {
                  const label = typeLabel(r.type);
                  return <Badge tone={typeTone(r.type, label)}>{label}</Badge>;
                },
              },
              { key: 'target', title: '대상', width: 250 },
              { key: 'dept', title: '사용자 그룹', width: 110 },
              {
                key: 'result',
                title: '처리 결과',
                width: 180,
                render: (r) => (r.result ? <Badge tone={resultTone(r.result)}>{resultLabel(r.result)}</Badge> : <Text style={s.td}>—</Text>),
              },
              { key: 'detail', title: '비고', flex: 1, minWidth: 180, wrap: true },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
