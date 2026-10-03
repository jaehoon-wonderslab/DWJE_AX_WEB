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
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, CardTabs, EmptyState, ExportMenuButton, FormAlert, Hint, Loading, TabulatorGrid, openConfirmModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { NO_WRITE_TEXT } from '../controller/useDataPermController';
import DataFieldManager from './DataFieldManager';
import DataPermGrid from './DataPermGrid';

/** 변경 이력 표 — 시각 · 대상 · 변경 내용 · 수행자 (DTP-10) */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 160, headerSort: false },
  { title: '대상', field: 'targetLabel', minWidth: 160, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 300, headerSort: false, formatter: 'textarea' },
  { title: '수행자', field: 'byLabel', minWidth: 150, headerSort: false },
];
/** 탭 — 값은 시험에서 쓰는 이름입니다(2026-10-02 표 · 이력을 탭으로 나눔) */
const TAB_MATRIX = 'matrix';
const TAB_LOGS = 'logs';

export default function DataPermView({
  loading, loadError, readOnly, busy, fields, depts, cellValue, lockReason, applyLockReason, toggle, planApply, applyApply,
  logs, logsLoading, logsError, canSeeAudit,
  viewCount, exportView, exportAll, reload,
}) {
  // 「계정으로 확인」 카드는 뺐습니다(2026-10-02) — 컨트롤러의 미리보기(preview)는 쓰지 않습니다
  const [tab, setTab] = useState(TAB_MATRIX);
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);

  /**
   * 무엇을 가릴지 정하는 곳 — 화면을 고르고 그 화면에 보이는 열을 골라 종류에 넣습니다.
   * 새 종류가 생기면 아래 표에 행이 늘어나므로 닫지 않아도 표를 다시 읽습니다.
   * 쓰기 권한이 없으면 열어서 보기만 합니다.
   */
  const openFieldManager = () => {
    const guard = { dirty: 0 };
    return openModal({
      title: '항목 관리',
      // 부제는 뺐습니다(2026-10-02) — 읽기 전용이면 안에서 알립니다
      ...(readOnly ? { sub: '읽기 전용 — 지금 무엇이 가려지는지 확인만 할 수 있습니다' } : null),
      maxWidth: 980,
      render: () => <DataFieldManager onChanged={reload} readOnly={readOnly} onDirtyChange={(n) => { guard.dirty = n; }} />,
      // 바꾼 열이 남아 있으면 「닫기」 전에 묻습니다(DTP-14). 바깥·× 로 닫는 것은 공통 모달이 가로채지 못합니다
      footer: (close) => (
        <Button
          label="닫기"
          onPress={() => {
            if (!guard.dirty) { close(); return; }
            openConfirmModal({
              title: '저장하지 않은 변경',
              message: `바꾼 열 ${guard.dirty}개가 저장되지 않았습니다. 닫으면 버립니다.`,
              confirmLabel: '버리고 닫기',
              danger: true,
              onConfirm: close,
            });
          }}
        />
      ),
    });
  };

  /** 적용 켜기/끄기 — 확인 창을 거칩니다 (DTP-04) */
  const onApply = (fieldKey) => {
    const plan = planApply(fieldKey);
    if (!plan) return;
    openConfirmModal({ ...plan.confirm, onConfirm: () => applyApply(plan) });
  };

  if (loading) return <Loading />;

  /** 탭 머리 오른쪽 — 그 탭에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_MATRIX]: (
      <>
        {busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        <ExportMenuButton viewCount={viewCount} onExportView={exportView} onExportAll={exportAll} />
        <Button label="항목 관리" size="sm" icon="settings" onPress={openFieldManager} />
      </>
    ),
    [TAB_LOGS]: canSeeAudit ? <Button label="보안 감사 로그에서 더 보기" size="sm" variant="ghost" onPress={() => goToScreen('sys-audit')} /> : null,
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
      <Hint>체크는 누르는 즉시 저장되어 적용됩니다. 체크를 끈 항목은 화면·엑셀·인쇄물에서 「비공개」로 가려집니다.</Hint>

      <Gap size={20} />
      <CardTabs
        id="data-perm"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_MATRIX, label: '부서별 데이터 접근 권한 관리', icon: 'shield', count: fields.length },
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
          ) : !fields.length ? (
            <EmptyState text="데이터 종류가 없습니다 — 항목 관리에서 만드세요" />
          ) : (
            <DataPermGrid fields={fields} depts={depts} cellValue={cellValue} lockReason={lockReason} applyLockReason={applyLockReason} toggle={toggle} onApply={onApply} />
          )
        ) : null}
        {tab === TAB_LOGS ? (
          <>
            <Text style={[s.textSm, { marginBottom: 12 }]}>데이터 접근 권한 변경 최근 20건</Text>
            {logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
              <TabulatorGrid autoWidth bordered headerFilter={false} rows={logs} rowKey="_key" columns={LOG_COLUMNS} emptyText="변경 이력이 없습니다." />
            )}
          </>
        ) : null}
      </CardTabs>
    </View>
  );
}
