/**
 * [View] SY-02 메뉴 접근 권한 (경로: /system/menu-perm)
 *
 * 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 즉시 바뀌고,
 * 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다.
 * 사용 API 5건 — /api/v1/system/menu-perms/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Hint, Loading, PermMatrix, ProgressBar, StatCard, Table, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';

export default function MenuPermView({
  loading, screens, depts, matrix, adminDepts, status, myDept, myCount, avgCount,
  toggle, toggleGroup, copyPerm, exportExcel,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();

  /** 선택 목록에 쓰는 부서 목록 — 값은 부서 ID, 표시는 부서명 */
  const deptOptions = depts.map((d) => ({ value: d.id, label: d.name }));
  /** 복사 대상 — 전 권한(잠금) 부서는 덮어쓸 수 없으므로 뺍니다 */
  const targetOptions = depts.filter((d) => !adminDepts.includes(String(d.id))).map((d) => ({ value: d.id, label: d.name }));

  /** 부서 권한 복사 */
  const openCopyForm = () =>
    openFormModal({
      title: '부서 권한 복사',
      sub: '한 부서의 메뉴 접근 권한을 다른 부서에 그대로 적용합니다',
      initial: { fromDeptId: depts[0]?.id, toDeptId: targetOptions[targetOptions.length - 1]?.value },
      fields: [
        { key: 'fromDeptId', label: '복사할 부서 (원본)', type: 'select', options: deptOptions, required: true },
        { key: 'toDeptId', label: '적용할 부서 (대상)', type: 'select', options: targetOptions, required: true },
      ],
      note: '대상 부서의 기존 메뉴 권한은 덮어쓰기 됩니다. 데이터 접근 권한은 함께 복사되지 않으며, 데이터 접근 권한 화면에서 별도로 설정합니다.',
      submitLabel: '복사',
      onSubmit: async (v) => (await copyPerm(v)).ok,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="메뉴 접근 권한"
        desc="부서별로 접근할 수 있는 화면을 지정합니다. 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 즉시 바뀌고, 권한이 없는 화면은 주소로 직접 접근해도 차단됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="계정 관리" size="sm" icon="users" onPress={() => goToScreen('sys-account')} />
            <Button label="데이터 접근 권한" size="sm" icon="eyeOff" onPress={() => goToScreen('sys-data')} />
            <Button label="부서 권한 복사" size="sm" variant="primary" icon="copy" onPress={openCopyForm} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="관리 대상 화면" value={screens.length} unit="개" sub={`메뉴 ${screens.filter((r) => !r.sub).length} · 하위 ${screens.filter((r) => r.sub).length}`} />
        <StatCard label="부서" value={depts.length} unit="개" sub="권한 부여 단위" />
        <StatCard label="내 부서 접근" value={myCount} unit="개" sub={myDept} />
        <StatCard label="전체 평균" value={avgCount} unit="개" sub="부서당 접근 화면" />
      </Grid>
      <Gap />

      <Hint>
        회색 행은 메뉴에 노출되지 않지만 버튼·링크로 진입하는 하위 화면입니다. 상위 화면만 열고 하위 화면을 닫으면 해당 버튼을 눌렀을 때 접근이 차단되므로 함께 열어 두는 것을 권장합니다.
      </Hint>

      <Card title="부서 × 화면" sub="체크된 화면만 좌측 메뉴에 표시되고 열람할 수 있습니다" tight>
        <PermMatrix
          maxHeight={620}
          rows={screens}
          columns={depts.map((d) => ({ key: d.id, label: d.name, sublabel: d.abbr, locked: adminDepts.includes(String(d.id)) }))}
          isChecked={(screenId, deptId) => (matrix[deptId] || []).includes(screenId)}
          onToggle={toggle}
          onToggleGroup={toggleGroup}
          footerLabel="접근 허용 화면 수"
          footerValue={(deptId) => (matrix[deptId] || []).length}
        />
      </Card>
      <Gap />

      <Card title="부서별 적용 현황" sub="권한 변경이 실제로 몇 개 계정에 영향을 주는지" tight>
        <Table
          minWidth={700}
          keyExtractor={(r) => r.deptId ?? r.dept}
          columns={[
            {
              key: 'dept',
              title: '부서',
              width: 170,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                  <Text style={s.td}>{r.dept}</Text>
                  {r.isAdmin ? <Badge tone="blue">전 권한</Badge> : null}
                </View>
              ),
            },
            { key: 'allowedCnt', title: '접근 허용', width: 110, align: 'right', num: true },
            { key: 'totalCnt', title: '전체 화면', width: 110, align: 'right', num: true },
            { key: 'userCnt', title: '영향 계정', width: 110, align: 'right', num: true },
            {
              key: 'ratio',
              title: '비율',
              flex: 1,
              minWidth: 140,
              render: (r) => (
                <View style={{ width: '100%' }}>
                  <ProgressBar percent={r.totalCnt ? (r.allowedCnt / r.totalCnt) * 100 : 0} />
                </View>
              ),
            },
          ]}
          rows={status}
        />
      </Card>
    </View>
  );
}
