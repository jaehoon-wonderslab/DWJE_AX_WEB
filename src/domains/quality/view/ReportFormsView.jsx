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
import { Badge, Button, Card, EmptyState, Loading, Table, openFormModal } from '@shared/components/ui';
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

  /**
   * 양식 등록·편집
   * 서버가 받는 항목은 양식명·유형·공개 정책(·항목 정의)입니다. 변경 메모는 서버 항목이 없어 두지 않습니다.
   * 항목 정의를 바꾼 수정만 파서 버전이 올라갑니다 — 이름·정책만 고치면 버전은 그대로입니다.
   */
  const openForm = (row) => {
    if (!types.length) {
      toast('양식 유형 공통코드(RPT_FORM_TYPE)를 불러오지 못했습니다');
      return;
    }
    openFormModal({
      title: row ? '양식 편집' : '양식 등록',
      sub: row ? `파서 ${row.parserVer || '—'} · 항목 정의가 바뀔 때만 파서 버전이 올라갑니다` : '등록 시 파서 버전은 v1.0 으로 시작합니다',
      initial: row ? { name: row.name, type: row.type, disclosurePolicy: row.disclosurePolicy } : { type: types[0]?.value, disclosurePolicy: policies[0]?.value },
      fields: [
        { key: 'name', label: '양식명', required: true, placeholder: '예) 8D 리포트' },
        { key: 'type', label: '유형', type: 'select', options: types, required: true },
        ...(policies.length ? [{ key: 'disclosurePolicy', label: '고객사 공개 정책', type: 'select', options: policies, full: true }] : []),
      ],
      note: '공개 정책에 따라 보고서 출력 시 단가·수율·거래처 항목이 자동으로 마스킹됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => {
        if (!v.name?.trim()) {
          toast('양식명을 입력하세요');
          return false;
        }
        if (!v.type) {
          toast('유형을 선택하세요');
          return false;
        }
        const res = await submitForm(row?.formId, v);
        return res.ok;
      },
    });
  };

  /** 양식 항목 정의 보기 */
  const showFields = (row) =>
    openModal({
      title: `${row.name} 항목 정의`,
      sub: `${row.fieldCnt ?? 0}개 항목 · 파서 ${row.parserVer || '—'}`,
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

      <Card title="양식 목록" sub={`${items.length}건 · 행을 누르면 항목 정의를 봅니다`} tight>
        {items.length === 0 ? (
          <EmptyState text="등록된 보고서 양식이 없습니다. 「양식 등록」으로 첫 양식을 만들어 주세요." />
        ) : (
        <Table
            minWidth={960}
            keyExtractor={(r) => r.formId}
            onRowPress={showFields}
            columns={[
              { key: 'name', title: '양식명', width: 180 },
              { key: 'type', title: '유형', width: 110, render: (r) => <Badge>{r.typeNm || labelOf(types, r.type)}</Badge> },
              { key: 'fieldCnt', title: '항목 수', width: 80, align: 'right', num: true },
              {
                key: 'disclosurePolicy',
                title: '고객사 공개 정책',
                flex: 1,
                minWidth: 260,
                render: (r) => (
                  <Text style={s.td} numberOfLines={1}>
                    {r.disclosurePolicy ? labelOf(policies, r.disclosurePolicy) : '—'}
                    {r.customer ? ` · ${r.customer}` : ''}
                  </Text>
                ),
              },
              { key: 'parserVer', title: '파서 버전', width: 92, align: 'center', mono: true, render: (r) => <Text style={[s.td, s.mono, { textAlign: 'center' }]}>{r.parserVer || '—'}</Text> },
              { key: 'updatedAt', title: '수정일', width: 110, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{String(r.updatedAt || '').slice(0, 10) || '—'}</Text> },
              { key: 'edit', title: '작업', width: 82, render: (r) => <Button label="편집" size="sm" onPress={() => openForm(r)} /> },
            ]}
            rows={items}
          />
        )}
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

  // 서버는 origin 을 대문자 코드(MES / AI / MANUAL)로 줍니다 — 항목 코드 접두사(mes_ · ai_)로 판정한 값입니다
  const originLabel = { mes: 'MES 자동', ai: 'AI 초안', manual: '수기' };
  const originOf = (r) => String(r.origin || 'manual').toLowerCase();
  return (
    <Table
      minWidth={620}
      keyExtractor={(r) => r.field || String(r.seq)}
      columns={[
        { key: 'label', title: '항목', flex: 1.4 },
        { key: 'field', title: '필드', width: 140, mono: true },
        {
          key: 'origin',
          title: '생성 주체',
          width: 100,
          render: (r) => {
            const o = originOf(r);
            return <Badge tone={o === 'ai' ? 'amber' : o === 'manual' ? '' : 'green'}>{originLabel[o] || r.origin || '—'}</Badge>;
          },
        },
        {
          key: 'dataFieldKey',
          title: '데이터 권한',
          width: 150,
          render: (r) => (
            <Text style={s.td} numberOfLines={1}>
              {r.dataFieldKey ? `${r.dataFieldKey}${r.dataFieldNm ? ` · ${r.dataFieldNm}` : ''}` : '—'}
            </Text>
          ),
        },
        { key: 'required', title: '필수', width: 70, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{r.required ? '●' : '—'}</Text> },
      ]}
      rows={fields}
      emptyText="정의된 항목이 없습니다. 항목은 양식 등록·수정 API 의 fields 로 정의합니다."
    />
  );
}
