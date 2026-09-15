/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도
 * 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다.
 * 사용 API 2건 — /api/v1/system/data-perms (조회·변경)
 */
import React from 'react';
import { View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Hint, Loading } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import DataFieldManager from './DataFieldManager';
import DataPermGrid from './DataPermGrid';

export default function DataPermView({
  loading, me, fields, depts, matrix, adminDepts, toggle, exportExcel, notifySaved,
}) {
  const { goToScreen } = useAppNavigation();
  const openModal = useUiStore((state) => state.openModal);

  /**
   * 통제할 항목 자체를 늘리는 곳 — 화면을 새로 만들지 않고 이 화면 안에서 엽니다.
   * 항목을 늘리면 표의 행이 늘고, 화면·엑셀의 마스킹도 다시 로그인하면 따라옵니다.
   */
  const openFieldManager = () =>
    openModal({
      title: '데이터 항목 관리',
      sub: '통제할 항목과 그 항목에 해당하는 응답 필드명을 정합니다',
      maxWidth: 940,
      render: () => <DataFieldManager />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="데이터 접근 권한"
        desc="부서별로 열람할 수 있는 데이터 항목을 지정합니다. 계정은 소속 부서의 설정을 그대로 상속하며, 허용되지 않은 항목은 메뉴 접근이 가능하더라도 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="항목 관리" size="sm" icon="settings" onPress={openFieldManager} />
            <Button label="메뉴 접근 권한" size="sm" icon="lock" onPress={() => goToScreen('sys-menu')} />
            <Button label="변경 저장" size="sm" variant="primary" icon="save" onPress={notifySaved} />
          </>
        }
      />

      <Hint>
        {`체크를 바꾸면 해당 부서 전 계정의 화면에 즉시 반영됩니다. 비공개로 둔 항목은 화면·엑셀·인쇄물에서 「비공개」로 가려집니다. 통제할 항목을 늘리려면 위 「항목 관리」에서 항목과 응답 필드명을 등록하세요 — 화면 수정 없이 반영됩니다. 현재 로그인 계정은 ${me?.name} · ${me?.dept} 입니다.`}
      </Hint>

      <Card title="부서 × 데이터 항목" sub="체크된 항목만 열람할 수 있습니다. 통합관리자 부서는 전 권한으로 고정됩니다." bodyStyle={{ padding: 20, minWidth: 0 }}>
        <DataPermGrid fields={fields} depts={depts} matrix={matrix} adminDepts={adminDepts} toggle={toggle} />
      </Card>
    </View>
  );
}
