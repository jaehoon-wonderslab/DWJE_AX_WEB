/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도
 * 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다.
 * 체크는 누르는 즉시 저장됩니다(별도 저장 단계 없음).
 * 사용 API 2건 — /api/v1/system/data-perms (조회·변경)
 */
import React from 'react';
import { View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Hint, Loading } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import DataFieldManager from './DataFieldManager';
import DataPermGrid from './DataPermGrid';

export default function DataPermView({
  loading, fields, depts, matrix, adminDepts, toggle, exportExcel, reload,
}) {
  const openModal = useUiStore((state) => state.openModal);

  /**
   * 무엇을 가릴지 정하는 곳 — 화면을 고르고 그 화면에 보이는 열을 골라 종류에 넣습니다.
   * 새 종류가 생기면 아래 표에 행이 늘어나므로 닫지 않아도 표를 다시 읽습니다.
   */
  const openFieldManager = () =>
    openModal({
      title: '항목 관리 — 화면 보고 가리기',
      sub: '화면에 보이는 열을 골라 가릴 종류에 넣습니다',
      maxWidth: 980,
      render: () => <DataFieldManager onChanged={reload} />,
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
          </>
        }
      />

      {/* 체크는 누르는 즉시 서버에 저장됩니다 — 따로 저장하는 단계가 없어 「변경 저장」 버튼을 두지 않습니다 */}
      <Hint>체크는 누르는 즉시 저장되어 그 부서 전 계정에 반영됩니다. 체크를 끈 항목은 화면·엑셀·인쇄물에서 「비공개」로 가려집니다.</Hint>

      <Card title="부서별 데이터 접근 권한 관리" sub="체크된 항목만 열람할 수 있습니다. 통합관리자 부서는 전 권한으로 고정됩니다." bodyStyle={{ padding: 20, minWidth: 0 }}>
        <DataPermGrid fields={fields} depts={depts} matrix={matrix} adminDepts={adminDepts} toggle={toggle} />
      </Card>
    </View>
  );
}
