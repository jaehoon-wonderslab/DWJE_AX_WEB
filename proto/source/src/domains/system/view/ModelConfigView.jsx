/**
 * [View] SY-10 AI 모델 설정 (경로: /system/model-config)
 *
 * Agent 별 이상 탐지 임계치, 분류 기준, 보안 필터링 패턴을 설정합니다.
 * 사용 API 4건 — /api/v1/ai/model-config, /ai/mask-rules
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, EmptyState, Loading, SelectField, Table, TextField, openFormModal } from '@shared/components/ui';
import { labelOf } from '@domains/common/model/codeRepository';

/** 분류 기준 key 표시명 — 서버가 이름을 주지 않는 항목만 여기서 보완합니다 */
const CLASSIFY_LABEL = {
  judge_boundary: '판정 경계값',
  borderline_range: '경계 구간',
  hitl_criteria: '사람 확인(HITL) 기준',
};

/** 임계치 라벨 — `metric (unit)` */
const thresholdLabel = (t) => `${t.metric || t.key}${t.unit ? ` (${t.unit})` : ''}`;

/** 값 → 입력란 문자열 */
const asText = (v) => (v === null || v === undefined ? '' : String(v));

/** SELECT 형 임계치의 선택지 — 서버가 쉼표 구분 문자열 또는 배열로 줍니다 */
function optionsOf(t) {
  if (Array.isArray(t.options)) return t.options.map((o) => (typeof o === 'string' ? o.trim() : o));
  return String(t.options || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * 임계치 한 항목 — `valueType` 별로 입력 위젯이 달라집니다.
 *  · SELECT → SelectField(options)
 *  · NUM(NUMBER) → 숫자 키보드 TextField
 *  · LIST → 쉼표 구분 안내가 붙은 TextField
 *  · 그 외(TEXT · BOOL) → TextField
 */
function ThresholdField({ t, onChange }) {
  const type = String(t.valueType || '').toUpperCase();
  const label = thresholdLabel(t);
  const opts = type === 'SELECT' ? optionsOf(t) : [];

  if (type === 'SELECT' && opts.length) {
    return <SelectField label={label} value={asText(t.value)} options={opts} onChange={onChange} hint={t.description} full />;
  }
  const numeric = type === 'NUM' || type === 'NUMBER';
  const hint = type === 'LIST' ? [t.description, '쉼표(,)로 구분해 여러 값을 적습니다'].filter(Boolean).join(' · ') : t.description;
  return (
    <TextField
      label={label}
      value={asText(t.value)}
      onChangeText={onChange}
      keyboardType={numeric ? 'numeric' : 'default'}
      placeholder={numeric ? '숫자' : undefined}
      hint={hint}
      full
    />
  );
}

export default function ModelConfigView({
  loading, thresholds, classifyRows, rules, maskTypes = [], dirty, setThreshold, setClassify, save, submitRule,
}) {
  /** 처리 선택지 — 공통코드(AI_MASK_TYPE)가 정본, 아직 못 받았으면 서버가 받는 4종 코드만 */
  const actionOptions = maskTypes.length
    ? maskTypes
    : ['FULL', 'PARTIAL', 'HASH', 'DROP'].map((v) => ({ value: v, label: v }));

  /** 보안 필터링 패턴 등록·편집 */
  const openRuleForm = (row) =>
    openFormModal({
      title: row ? '보안 필터링 패턴 편집' : '보안 필터링 패턴 등록',
      sub: '⑦ 보안 필터링 Agent 가 적용하는 마스킹 규칙입니다',
      initial: row
        ? {
            name: row.name,
            fieldKey: row.fieldKey || '',
            targetFields: Array.isArray(row.targetFields) ? row.targetFields.join(', ') : row.targetFields || '',
            action: row.action || 'FULL',
            customerPolicy: row.customerPolicy || '',
            useYn: row.useYn || (row.enabled === false ? 'N' : 'Y'),
          }
        : { action: 'FULL', useYn: 'Y' },
      fields: [
        { key: 'name', label: '패턴명', required: true, placeholder: '예) 단가' },
        { key: 'fieldKey', label: '데이터 항목 key', placeholder: '예) price' },
        { key: 'targetFields', label: '대상 컬럼', required: true, placeholder: 'schema.table.column (쉼표로 구분)', full: true },
        { key: 'action', label: '처리', type: 'select', options: actionOptions },
        { key: 'useYn', label: '사용', type: 'select', options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] },
        { key: 'customerPolicy', label: '고객사 정책', placeholder: '정책 설명', full: true },
      ],
      note: '패턴은 보고서·AI 응답·다운로드 전 구간에 함께 적용되며, 처리 내역은 감사 로그에 기록됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitRule(row?.ruleId, v)).ok,
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="AI 모델 설정"
        desc="Agent 별 이상 탐지 임계치, 분류 기준, 보안 필터링 패턴을 설정합니다. 임계치·분류 기준은 저장 버튼을 눌러야 반영됩니다."
        actions={<Button label={dirty ? '저장 (변경 있음)' : '저장'} size="sm" variant="primary" icon="save" onPress={save} />}
      />

      <Grid cols={2}>
        <Card title="이상 탐지 임계치" sub="⑨ 이상 알림 Agent · 서버에 등록된 항목만 표시됩니다">
          {thresholds.length ? (
            thresholds.map((t, i) => (
              <View key={t.key} style={i ? { marginTop: 14 } : undefined}>
                <ThresholdField t={t} onChange={(v) => setThreshold(t.key, v)} />
              </View>
            ))
          ) : (
            <EmptyState text="등록된 임계치 항목이 없습니다. 지표 기준을 먼저 등록해 주세요." />
          )}
        </Card>

        <Card title="분류 기준" sub="③ 불량 판정 Agent">
          {classifyRows.length ? (
            classifyRows.map((row, i) => (
              <View key={row.key} style={i ? { marginTop: 14 } : undefined}>
                <TextField
                  label={CLASSIFY_LABEL[row.key] || row.key}
                  value={asText(row.value)}
                  onChangeText={(v) => setClassify(row.key, v)}
                  full
                />
              </View>
            ))
          ) : (
            <EmptyState text="등록된 분류 기준이 없습니다." />
          )}
        </Card>
      </Grid>
      <Gap />

      <Card
        title="보안 필터링 패턴"
        sub="⑦ 보안 필터링 Agent"
        tight
        right={<Button label="패턴 등록" size="sm" icon="plus" onPress={() => openRuleForm(null)} />}
      >
        <Table
          minWidth={860}
          keyExtractor={(r) => r.ruleId}
          emptyText="등록된 보안 필터링 패턴이 없습니다. 「패턴 등록」으로 마스킹 규칙을 추가해 주세요."
          columns={[
            { key: 'name', title: '패턴명', width: 130 },
            {
              key: 'targetFields',
              title: '대상 필드',
              flex: 1,
              minWidth: 220,
              mono: true,
              render: (r) => <Text style={{ fontSize: 12 }}>{Array.isArray(r.targetFields) ? r.targetFields.join(', ') : r.targetFields || r.fields || '—'}</Text>,
            },
            {
              key: 'action',
              title: '처리',
              width: 110,
              render: (r) => <Badge tone={r.action === 'FULL' ? 'red' : 'amber'}>{r.action ? labelOf(maskTypes, r.action) : '—'}</Badge>,
            },
            { key: 'customerPolicy', title: '고객사 정책', width: 170 },
            {
              key: 'useYn',
              title: '사용',
              width: 78,
              render: (r) => {
                const on = r.useYn ? r.useYn === 'Y' : !!r.enabled;
                return <Badge tone={on ? 'green' : ''}>{on ? 'Y' : 'N'}</Badge>;
              },
            },
            { key: 'edit', title: '관리', width: 82, render: (r) => <Button label="편집" size="sm" onPress={() => openRuleForm(r)} /> },
          ]}
          rows={rules}
        />
      </Card>
    </View>
  );
}
