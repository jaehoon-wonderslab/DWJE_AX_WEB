/**
 * [View] SY-02 메뉴 접근 권한 (경로: /system/menu-perm · 화면 ID sys-menu)
 *
 * 부서마다 화면별 「접근」 권한을 지정합니다(2026-10-03 조회/쓰기 통합). 접근할 수 있으면 그 화면의 모든 동작을
 * 허용합니다(미배정 계정만 쓰기 불가). 바꾸면 그 부서에 속한 계정의 좌측 메뉴가 다음 요청부터 바뀌고,
 * 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다.
 *  · 통합관리자 열은 전 권한, 미배정 열은 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정(변경 불가)
 *  · 관리 화면 5종(계정 관리·메뉴 접근 권한·데이터 접근 권한·그룹웨어 부서 매핑·전사 자연어 질의 이력)은 통합관리자만 바꿉니다
 *  · 미배정 계정이면 읽기 전용입니다(엑셀 다운로드는 그대로)
 * 사용 API — GET/PUT /api/v1/system/menu-perms · PUT …/group · POST …/copy(미리보기·실행)
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, CardTabs, EmptyState, ExportMenuButton, FormAlert, Hint, Loading, StatCard, TabulatorGrid, openConfirmModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { NO_WRITE_TEXT } from '../controller/useMenuPermController';
import MenuPermCopyForm from './MenuPermCopyForm';
import MenuPermGrid from './MenuPermGrid';

/** 변경 이력 표 — 시각 · 대상 · 변경 내용 · 수행자 (좁은 화면은 표 안에서 가로 스크롤) */
const LOG_COLUMNS = [
  { title: '시각', field: 'ts', minWidth: 160, headerSort: false },
  { title: '대상', field: 'targetLabel', minWidth: 220, headerSort: false },
  { title: '변경 내용', field: 'detailLabel', minWidth: 320, headerSort: false, formatter: 'textarea' },
  { title: '수행자', field: 'byLabel', minWidth: 150, headerSort: false },
];

/** 탭 — 값은 시험에서 쓰는 이름입니다(2026-10-02 「부서 × 화면」 · 「최근 변경 이력」 을 탭으로 나눔) */
const TAB_MATRIX = 'matrix';
const TAB_LOGS = 'logs';

export default function MenuPermView({
  loading, loadError, reload, busy, readOnly, isSuperAdmin, screens, depts, collapsed, toggleCollapsed,
  cellValue, lockReason, cellWarn, groupLockReason, grantCounts, myDept, myCount, avgCount,
  planToggle, applyToggle, toggleGroup, copyOptions, screenLabel, previewCopy, executeCopy,
  viewCount, totalCount, exportView, exportAll,
  grantsOf, logs, logsLoading, logsError, canSeeAudit,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);
  const [tab, setTab] = useState(TAB_MATRIX);

  /** 칸 변경 — 확인이 필요한 변경(관리 화면·하위 화면이 있는 상위 해제)은 확인 창을 거칩니다 */
  const onToggle = (screenId, deptId) => {
    const plan = planToggle(screenId, deptId);
    if (!plan) return;
    if (!plan.confirm) { applyToggle(plan); return; }
    if (!plan.children?.length) { openConfirmModal({ ...plan.confirm, onConfirm: () => applyToggle(plan) }); return; }
    // 하위 화면이 있는 상위 화면 끄기 — 「이 화면만」 / 「함께 끄기」 (MNP-10)
    openModal({
      title: plan.confirm.title,
      render: () => <Text style={s.text}>{plan.confirm.message}</Text>,
      footer: (close) => (
        <>
          <Button label="취소" onPress={close} />
          <Button label="이 화면만 끄기" onPress={() => { close(); applyToggle(plan); }} />
          <Button label="함께 끄기" variant="danger" onPress={() => { close(); applyToggle(plan, { withChildren: true }); }} />
        </>
      ),
    });
  };

  /** 부서 권한 복사 — 미리보기 → 확인 → 복사 */
  const openCopyForm = () =>
    openModal({
      title: '부서 권한 복사',
      sub: '한 부서의 메뉴 접근 권한을 다른 부서에 그대로 적용합니다. 먼저 미리보기로 바뀌는 내용을 확인합니다.',
      maxWidth: 640,
      render: (close) => (
        <MenuPermCopyForm
          options={copyOptions}
          screenLabel={screenLabel}
          isSuperAdmin={isSuperAdmin}
          previewCopy={previewCopy}
          executeCopy={executeCopy}
          close={close}
        />
      ),
    });

  /** 개인 허용 명단 (MNP-06) — 명단이 없는 응답(sys-account 만 가진 계정)이면 건수만 알립니다 */
  const showGrants = (screenId) => {
    const screen = screens.find((x) => x.id === screenId);
    const list = grantsOf(screenId);
    openModal({
      title: `개인 허용 — ${screen?.label || screen?.name || screenId}`,
      sub: '부서 권한과 별개로 계정 관리에서 이 화면을 추가로 허용한 계정입니다. 회수는 계정 관리에서 합니다.',
      render: () => (
        list === null ? (
          <Text style={s.text}>{`${grantCounts[screenId] || 0}명이 개인 허용을 받았습니다. 명단은 메뉴 접근 권한 화면 권한이 있을 때만 보입니다.`}</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {list.map((g) => (
              <Text key={g.empNo} style={s.textSm}>
                {`${g.name || '-'} (${g.empNo}) · ${depts.find((d) => String(d.id) === String(g.deptId))?.name || '-'}`}
              </Text>
            ))}
            {!list.length ? <Text style={s.textSm}>명단이 없습니다.</Text> : null}
          </View>
        )
      ),
      footer: (close) => (
        <>
          <Button label="계정 관리로 이동" onPress={() => { close(); goToScreen('sys-account'); }} />
          <Button label="닫기" variant="primary" onPress={close} />
        </>
      ),
    });
  };

  if (loading) return <Loading />;

  const menuCnt = screens.filter((r) => !r.sub && !r.action).length;
  const subCnt = screens.filter((r) => r.sub && !r.action).length;
  const actionCnt = screens.filter((r) => r.action).length;
  const userTotal = depts.reduce((n, d) => n + Number(d.userCnt || 0), 0);

  /** 탭 머리 오른쪽 — 그 탭의 표에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_MATRIX]: (
      <>
        {busy ? <Text style={s.textXs}>저장 중…</Text> : null}
        <ExportMenuButton viewCount={viewCount} totalCount={totalCount} onExportView={exportView} onExportAll={exportAll} />
        <Button label="부서 권한 복사" size="sm" variant="primary" icon="copy" disabled={busy || readOnly || !depts.length} onPress={openCopyForm} />
      </>
    ),
    [TAB_LOGS]: canSeeAudit ? <Button label="보안 감사 로그에서 더 보기" size="sm" variant="ghost" onPress={() => goToScreen('sys-audit')} /> : null,
  };
  /** 탭 내용 첫 줄 — 예전 카드 부제 */
  const tabSub = {
    [TAB_MATRIX]: '메뉴 그룹의 +/− 버튼으로 펼치거나 접습니다. 그룹 일괄 변경은 접힌 화면을 포함한 그룹 전체(동작 행 제외)에 적용됩니다.',
    [TAB_LOGS]: '메뉴 접근 권한 변경 최근 20건',
  };

  return (
    <View>
      <PageHead
        title="부서별 메뉴 접근 권한"
        desc="부서별로 화면마다 접근 권한을 지정합니다. 접근할 수 있으면 그 화면의 모든 동작을 쓸 수 있습니다. 부서 기본 권한을 변경하며, 계정별 추가 허용 메뉴는 계정 관리에서 별도로 설정합니다."
        actions={
          // 다른 화면으로 가는 단추만 머리말에 둡니다 — 표에 쓰는 단추(엑셀·부서 권한 복사)는 탭 머리로 옮겼습니다
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button label="계정 관리" size="sm" icon="users" onPress={() => goToScreen('sys-account')} />
            <Button label="데이터 접근 권한" size="sm" icon="eyeOff" onPress={() => goToScreen('sys-data')} />
          </View>
        }
      />

      {readOnly ? (
        <>
          <FormAlert tone="info">{`읽기 전용 — ${NO_WRITE_TEXT} 엑셀 다운로드는 그대로 쓸 수 있습니다.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      <Grid cols={4}>
        <StatCard label="관리 대상 화면" value={screens.length} unit="개" sub={`메뉴 ${menuCnt} · 하위 ${subCnt} · 동작 ${actionCnt}`} />
        <StatCard label="부서" value={depts.length} unit="개" sub={`계정 ${userTotal.toLocaleString('ko-KR')}명`} />
        <StatCard label="내 부서 접근" value={myCount} unit="개" sub={myDept || '—'} />
        <StatCard label="부서 평균" value={avgCount} unit="개" sub="시스템 부서·빈 부서 제외" />
      </Grid>
      <Gap />

      <Hint>
        {'그룹 「전체 허용」은 동작 행을 포함하지 않습니다. 화면에 접근할 수 있으면 그 화면의 등록·수정·삭제도 함께 쓸 수 있습니다. 관리 화면(관리) 칸은 통합관리자만 바꿉니다. 미배정 부서는 대시보드·덕반장 AI·질의 이력 조회 전용(쓰기 불가), 데이터 권한 0건으로 고정되어 있습니다. 「동작」 행(예: AI 통합 대시보드 › 업로드 리포트 업로드)은 화면이 아니라 그 버튼을 쓸 수 있는지를 정합니다.'}
      </Hint>

      <Gap size={20} />
      <CardTabs
        id="menu-perm"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_MATRIX, label: '부서 × 화면', icon: 'grid', count: screens.length },
          { value: TAB_LOGS, label: '최근 변경 이력', icon: 'history', count: logsLoading ? undefined : logs.length },
        ]}
        right={tabActions[tab]}
      >
        <Text style={[s.textSm, { marginBottom: 12 }]}>{tabSub[tab]}</Text>
        {tab === TAB_MATRIX ? (
          loadError ? (
            <View style={{ gap: 10 }}>
              <FormAlert>{loadError}</FormAlert>
              <View style={{ flexDirection: 'row' }}><Button label="다시 시도" size="sm" icon="refresh" onPress={reload} /></View>
            </View>
          ) : !screens.length || !depts.length ? (
            <EmptyState text="화면 또는 부서가 없습니다 — DB 화면 행(ax.tb_sys_menu)을 확인하세요" />
          ) : (
            <MenuPermGrid
              screens={screens}
              depts={depts}
              collapsed={collapsed}
              toggleCollapsed={toggleCollapsed}
              cellValue={cellValue}
              lockReason={lockReason}
              cellWarn={cellWarn}
              groupLockReason={groupLockReason}
              grantCounts={grantCounts}
              onToggle={onToggle}
              onToggleGroup={toggleGroup}
              onShowGrants={showGrants}
            />
          )
        ) : null}
        {tab === TAB_LOGS ? (
          logsError ? <FormAlert>{logsError}</FormAlert> : logsLoading ? <Loading /> : (
            <TabulatorGrid
              autoWidth
              bordered
              headerFilter={false}
              rows={logs}
              rowKey="_key"
              emptyText="변경 이력이 없습니다."
              columns={LOG_COLUMNS}
            />
          )
        ) : null}
      </CardTabs>
    </View>
  );
}
