/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm · 화면 ID sys-data)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도 서버 응답에서 가려지고(값 null)
 * 화면·보고서·인쇄물·엑셀에는 「비공개」 로 보입니다. 체크는 누르는 즉시 저장됩니다(별도 저장 단계 없음).
 *
 * 2026-10-01 (기획 04 DTP-16·17·18)
 *  · 통합관리자 열은 전 권한, 미배정 열은 데이터 권한 0건 고정(잠금)
 *  · sys-data 쓰기 권한이 없으면 읽기 전용 — 체크·항목 관리의 저장·삭제가 꺼집니다(엑셀은 그대로)
 *  · 엑셀은 「조회 목록 / 전체」 두 범위
 * 사용 API — GET/PUT /api/v1/system/data-perms · /api/v1/system/data-fields/* (mapping 포함)
 *
 * 2026-10-07 — 항목 단위 권한(V82). 표를 「항목 × 부서」 하나로 바꿨습니다(ItemPermGrid).
 *  · 행 = 항목(화면에 보이는 이름), 출력 화면 열, 부서마다 열람 체크 — 묶음(종류) · [항목 관리] 단추 · 모달은 없습니다
 *  · 「제거됨」: DataFieldManager(항목 관리 모달) · DataPermGrid(종류 × 부서 표) — 파일은 남겨 둡니다(되살릴 수 있게)
 * 사용 API — GET /api/v1/system/data-perms · PUT /api/v1/system/data-fields/item-perms
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, CardTabs, EmptyState, ExportMenuButton, FormAlert, Hint, Loading, TabulatorGrid, dateTimeHeaderFilter,
} from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { NO_WRITE_TEXT } from '../controller/useDataPermController';
import ItemPermGrid from './ItemPermGrid';

/**
 * 변경 이력 표 — 시각 · 대상 · 변경 내용 · 작업자 (DTP-10)
 * 2026-10-07: 「수행자」 → 「작업자」, 열마다 머리글 검색칸(시각은 직접 입력 + 달력), 전량을 받아 쪽 나누기
 */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 210, headerSort: false, ...dateTimeHeaderFilter() },
  { title: '대상', field: 'targetLabel', minWidth: 160, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 300, headerSort: false, formatter: 'textarea' },
  { title: '작업자', field: 'byLabel', minWidth: 150, headerSort: false },
];
/** 변경 이력 표시 건수 — 10 · 25 · 50 · 100, 기본 50 */
const LOG_PAGE_SIZES = [10, 25, 50, 100];
const LOG_PAGE_SIZE = 50;
/** 탭 — 값은 시험에서 쓰는 이름입니다(2026-10-02 표 · 이력을 탭으로 나눔) */
const TAB_MATRIX = 'matrix';
const TAB_LOGS = 'logs';

export default function DataPermView({
  loading, loadError, readOnly, busy, depts, lockReason,
  items, itemCell, toggleItem, offTableOf,
  logs, logsLoading, logsError,
  viewCount, exportView, exportAll, reload,
}) {
  const [tab, setTab] = useState(TAB_MATRIX);
  const s = useCommonStyles();

  if (loading) return <Loading />;

  /** 탭 머리 오른쪽 — 그 탭에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_MATRIX]: (
      <>
        {busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        <ExportMenuButton viewCount={viewCount} onExportView={exportView} onExportAll={exportAll} />
        {/* [항목 관리] 단추는 뺐습니다(2026-10-07) — 이 표에서 항목마다 부서를 바로 정합니다 */}
      </>
    ),
    // [보안 감사 로그에서 더 보기] 는 뺐습니다(2026-10-07)
    [TAB_LOGS]: null,
  };

  return (
    <View>
      {/* 머리말 설명과 [메뉴 접근 권한] 단추는 뺐습니다(2026-10-02) */}
      <PageHead title="데이터 접근 권한" />

      {readOnly ? (
        <>
          <FormAlert tone="info">{`읽기 전용 — ${NO_WRITE_TEXT} 엑셀 다운로드는 그대로 쓸 수 있습니다.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      {/* 체크는 누르는 즉시 서버에 저장됩니다 — 따로 저장하는 단계가 없어 「변경 저장」 버튼을 두지 않습니다 */}
      {/* 한 줄 안내 대신 동작 방식을 풀어 씁니다(2026-10-07 「사람이 이해하기 어려운 구조」 피드백) */}
      <DataPermGuide />

      <Gap size={20} />
      <CardTabs
        id="data-perm"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_MATRIX, label: '부서별 데이터 접근 권한 관리', icon: 'shield', count: viewCount },
          { value: TAB_LOGS, label: '최근 변경 이력', icon: 'history', count: logsLoading ? undefined : logs.length },
        ]}
        right={tabActions[tab]}
      >
        {tab === TAB_MATRIX ? (
          loadError ? (
            <View style={{ gap: 10 }}>
              <FormAlert>{loadError}</FormAlert>
              <View style={{ flexDirection: 'row' }}><Button label="다시 시도" size="sm" icon="refresh" onPress={reload} /></View>
            </View>
          ) : !items.length ? (
            <EmptyState text="항목이 없습니다." />
          ) : (
            <ItemPermGrid items={items} depts={depts} itemCell={itemCell} lockReason={lockReason} toggleItem={toggleItem} offTableOf={offTableOf} />
          )
        ) : null}
        {tab === TAB_LOGS ? (
          // 「최근 20건」 부제 · 열 너비 안내는 뺐습니다(2026-10-07)
          logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
            <TabulatorGrid
              autoWidth
              fillWidth
              widthHint={false}
              bordered
              pageSize={LOG_PAGE_SIZE}
              pageSizes={LOG_PAGE_SIZES}
              rows={logs}
              rowKey="_key"
              columns={LOG_COLUMNS}
              emptyText="변경 이력이 없습니다."
            />
          )
        ) : null}
      </CardTabs>
    </View>
  );
}

/**
 * 이 화면이 하는 일 — 처음 보는 관리자가 표를 읽을 수 있게 네 줄로 풀어 둡니다(2026-10-07)
 *  · 행(데이터 항목) = 함께 가릴 값 묶음, 열(부서) = 누가 볼 수 있나, 체크 = 볼 수 있음
 */
function DataPermGuide() {
  const lines = [
    ['표의 행', '「항목」 은 화면에 보이는 값의 이름입니다. 같은 항목이 여러 화면에 나오면 「출력 화면」 칸에 모두 적힙니다.'],
    ['부서 칸 체크', '체크한 부서의 사람은 그 항목을 그대로 봅니다. 체크를 끄면 그 부서 사람에게는 모든 출력 화면 · 엑셀 · 인쇄물에서 「●●●● 비공개」 로 보입니다.'],
    ['저장', '체크는 누르는 즉시 저장됩니다. 다른 사람의 화면에는 그 화면을 다시 열 때 반영됩니다.'],
    ['가릴 수 없는 항목', '화면마다 다른 값을 담는 공용 키, 로그인 · 권한에 쓰는 시스템 값은 체크할 수 없습니다. 메뉴(화면) 자체를 막으려면 메뉴 접근 권한 화면을 씁니다.'],
  ];
  return (
    <View nativeID="data-perm-guide">
      <Hint>
        {lines.map(([head, body], i) => (
          <Text key={head}>
            {i ? '\n' : ''}
            <Text style={{ fontWeight: '700' }}>{head}</Text>
            {`  ${body}`}
          </Text>
        ))}
      </Hint>
    </View>
  );
}
