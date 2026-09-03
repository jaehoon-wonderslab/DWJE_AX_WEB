/**
 * [View] QC-04 보고서 양식 관리 (경로: /quality/report-forms)
 *
 * 보고서 양식과 고객사별 공개 정책을 등록·관리합니다.
 * 양식 구조가 바뀌면 파서 버전을 함께 올려 관리합니다.
 * 사용 API 4건 — /api/v1/quality/report-forms/*
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Loading, Table, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';

// 선택지·표시명은 서버 공통코드에서 받습니다 (RPT_FORM_TYPE · VEC_CONFIDENTIAL)

export default function ReportFormsView({ loading, items, codes, submitForm, exportExcel, loadFormFields }) {
  const types = codes?.RPT_FORM_TYPE || [];
  const policies = codes?.VEC_CONFIDENTIAL || [];

  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 양식 등록·편집 */
  const openForm = (row) =>
    openFormModal({
      title: row ? '양식 편집' : '양식 등록',
      sub: '양식 구조 변경 시 파서 버전을 함께 관리합니다',
      initial: row ? { name: row.name, type: row.type, disclosurePolicy: row.disclosurePolicy } : { type: types[0]?.value, disclosurePolicy: policies[0]?.value },
      fields: [
        { key: 'name', label: '양식명', required: true, placeholder: '예) 8D 리포트' },
        { key: 'type', label: '유형', type: 'select', options: types, required: true },
        { key: 'disclosurePolicy', label: '고객사 공개 정책', type: 'select', options: policies, full: true },
        { key: 'note', label: '변경 메모', type: 'textarea', rows: 2, full: true, placeholder: '무엇이 달라졌는지 적어 두면 파서 버전 추적이 쉬워집니다' },
      ],
      note: '공개 정책에 따라 보고서 출력 시 단가·수율·거래처 항목이 자동으로 마스킹됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => {
        if (!v.name?.trim()) {
          toast('양식명을 입력하세요');
          return false;
        }
        const res = await submitForm(row?.formId, v);
        return res.ok;
      },
    });

  /** 양식 항목 정의 보기 */
  const showFields = (row) =>
    openModal({
      title: `${row.name} 항목 정의`,
      sub: `${row.fieldCnt}개 항목 · 파서 ${row.parserVer}`,
      wide: true,
      render: () => <FormFields formId={row.formId} loadFormFields={loadFormFields} />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="보고서 양식 관리"
        desc="보고서 양식과 고객사별 공개 정책을 등록·관리합니다. 양식 구조가 바뀌면 파서 버전을 함께 관리합니다."
        actions={
          <>
            <Button label="품질 보고서로" size="sm" icon="arrowLeft" onPress={() => goToScreen('qc-report')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="양식 등록" size="sm" variant="primary" icon="plus" onPress={() => openForm(null)} />
          </>
        }
      />

      <Card title="양식 목록" sub={`${items.length}건`} tight>
        <Table
            minWidth={960}
            keyExtractor={(r) => r.formId}
            onRowPress={showFields}
            columns={[
              { key: 'name', title: '양식명', width: 180 },
              { key: 'type', title: '유형', width: 110, render: (r) => <Badge>{r.typeNm || labelOf(types, r.type)}</Badge> },
              { key: 'fieldCnt', title: '항목 수', width: 80, align: 'right', num: true },
              { key: 'disclosurePolicy', title: '고객사 공개 정책', flex: 1, minWidth: 260, render: (r) => <Text style={s.td}>{labelOf(policies, r.disclosurePolicy)}</Text> },
              { key: 'parserVer', title: '파서 버전', width: 92, align: 'center', mono: true },
              { key: 'updatedAt', title: '수정일', width: 110, align: 'center' },
              { key: 'edit', title: '작업', width: 82, render: (r) => <Button label="편집" size="sm" onPress={() => openForm(r)} /> },
            ]}
            rows={items}
          />
      </Card>
    </View>
  );
}

/** 양식 항목 정의 목록 */
function FormFields({ formId, loadFormFields }) {
  const s = useCommonStyles();
  const [fields, setFields] = useState(null);

  useEffect(() => {
    let alive = true;
    loadFormFields(formId)
      .then((res) => {
        if (alive) setFields(res?.fields || []);
      })
      .catch(() => {
        if (alive) setFields([]);
      });
    return () => {
      alive = false;
    };
  }, [formId, loadFormFields]);

  if (!fields) return <Loading />;

  const originLabel = { mes: 'MES 자동', ai: 'AI 초안', manual: '수기' };
  return (
    <Table
      minWidth={620}
      keyExtractor={(r) => r.field}
      columns={[
        { key: 'label', title: '항목', flex: 1.4 },
        { key: 'field', title: '필드', width: 120, mono: true },
        {
          key: 'origin',
          title: '생성 주체',
          width: 100,
          render: (r) => <Badge tone={r.origin === 'ai' ? 'amber' : r.origin === 'manual' ? '' : 'green'}>{originLabel[r.origin]}</Badge>,
        },
        { key: 'dataFieldKey', title: '데이터 권한', width: 110, render: (r) => <Text style={s.td}>{r.dataFieldKey || '—'}</Text> },
        { key: 'required', title: '필수', width: 70, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{r.required ? '●' : '—'}</Text> },
      ]}
      rows={fields}
    />
  );
}
