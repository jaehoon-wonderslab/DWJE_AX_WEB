/**
 * [View] SY-03 데이터 접근 권한 (경로: /system/data-perm)
 *
 * 허용되지 않은 항목은 메뉴 접근이 가능하더라도
 * 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다.
 * 사용 API 6건 — /api/v1/system/data-perms/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Hint, KeyValue, Loading, Pagination, PermMatrix, SelectField, SourceNote, Table } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';

/** 데이터 접근 감사 결과 코드(LOG_AUDIT_RESULT) 표기 */
const AUDIT_RESULT = {
  ALLOW: { label: '열람', tone: 'green' },
  BLIND: { label: '비공개', tone: 'amber' },
  REJECT: { label: '차단', tone: 'red' },
};

export default function DataPermView({
  loading, me, fields, depts, matrix, adminDepts, preview, previewEmpNo, setPreviewEmpNo, byUser, audit, auditPaging, auditMeta, fieldNameOf, toggle, exportExcel, notifySaved,
}) {
  const previewUser = byUser.find((u) => u.empNo === previewEmpNo);

  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();

  /**
   * 미리보기 값 — 마스킹 판정은 **대상 계정** 기준으로 서버가 내려 줍니다(`masked`).
   * BlindValue 는 로그인 계정의 권한으로 판정하므로 여기서는 쓰지 않고, 같은 모양(●●●● 비공개)으로 그립니다.
   */
  const renderPreview = (it) =>
    it.masked ? (
      <View style={s.blind} accessibilityLabel={`비공개 항목 — ${it.name}`}>
        <Text style={[s.blindText, { opacity: 0.55 }]}>●●●●</Text>
        <Text style={s.blindText}>비공개</Text>
      </View>
    ) : (
      <Text style={[s.kvVal, s.num]}>{it.rendered || '원본 노출'}</Text>
    );

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="데이터 접근 권한"
        desc="부서별로 열람할 수 있는 데이터 항목을 지정합니다. 계정은 소속 부서의 설정을 그대로 상속하며, 허용되지 않은 항목은 메뉴 접근이 가능하더라도 화면·보고서·인쇄물·CSV 에서 blind 처리됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="메뉴 접근 권한" size="sm" icon="lock" onPress={() => goToScreen('sys-menu')} />
            <Button label="변경 저장" size="sm" variant="primary" icon="save" onPress={notifySaved} />
          </>
        }
      />

      <Hint>
        {`체크를 바꾸면 해당 부서 전 계정의 화면에 즉시 반영됩니다. 현재 로그인 계정은 ${me?.name} · ${me?.dept} 입니다 — 아래 적용 미리보기에서 결과를 바로 확인할 수 있습니다.`}
      </Hint>

      <Card title="부서 × 데이터 항목" sub="체크된 항목만 열람할 수 있습니다" tight>
        <PermMatrix
          rows={fields.map((f) => ({ id: f.key, name: f.name, desc: f.desc }))}
          columns={depts.map((d) => ({ key: d.id, label: d.name, sublabel: d.abbr, locked: adminDepts.includes(String(d.id)) }))}
          isChecked={(fieldKey, deptId) => (matrix[deptId] || []).includes(fieldKey)}
          onToggle={toggle}
          descOf={(r) => fields.find((f) => f.key === r.id)?.desc}
          rowLabelWidth={150}
          footerLabel="허용 항목 수"
          footerValue={(deptId) => (matrix[deptId] || []).length}
        />
      </Card>
      <Gap />

      <Grid cols={2}>
        <Card
          title="적용 미리보기"
          sub={`${preview?.name || previewUser?.name || me?.name} · ${preview?.dept || previewUser?.dept || me?.dept} 기준 실제 렌더 결과`}
          right={
            // 관리자가 '이 사람에게는 무엇이 보이는가' 를 직접 확인할 수 있어야 합니다.
            // 컨트롤러에는 previewEmpNo 가 있었는데 화면에 고를 수단이 없었습니다.
            <SelectField
              value={previewEmpNo}
              options={byUser.map((u) => ({ value: u.empNo, label: `${u.name} · ${u.dept}` }))}
              onChange={setPreviewEmpNo}
              style={{ width: 190 }}
            />
          }
        >
          <KeyValue
            keyWidth={110}
            rows={(preview?.items || []).map((it) => [it.name || fieldNameOf(it.fieldKey), <View key={it.fieldKey}>{renderPreview(it)}</View>])}
          />
          {!preview?.items?.length ? <Text style={[s.textXs, { paddingVertical: 8 }]}>미리보기 대상 계정을 선택하면 항목별 노출 결과가 표시됩니다.</Text> : null}
          <SourceNote>blind 항목은 값 자체가 화면·인쇄물·CSV 어디에도 포함되지 않습니다.</SourceNote>
        </Card>

        <Card title="계정별 적용 결과" sub="부서 설정이 계정에 상속된 상태" tight>
          <Table
            minWidth={520}
            keyExtractor={(r) => r.empNo}
            columns={[
              { key: 'name', title: '계정', width: 110, render: (r) => <Text style={s.td}>{`${r.name}${r.pos ? ` ${r.pos}` : ''}`}</Text> },
              { key: 'dept', title: '부서', width: 108 },
              { key: 'allowedCnt', title: '허용 항목', width: 88, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.allowedCnt ?? (r.allowedFields || []).length}</Text> },
              {
                key: 'maskedFields',
                title: '비공개',
                flex: 1,
                minWidth: 200,
                render: (r) => (
                  <Text style={[s.textXs, { paddingHorizontal: 14 }]}>
                    {(r.maskedFields || []).length ? r.maskedFields.map(fieldNameOf).join(' · ') : '—'}
                  </Text>
                ),
              },
            ]}
            rows={byUser}
          />
        </Card>
      </Grid>
      <Gap />

      <Card title="데이터 접근 감사" sub="blind 처리 · 열람 시도 이력" tight>
        <Table
          minWidth={840}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'empNo', title: '계정', width: 90, mono: true },
            { key: 'dept', title: '부서', width: 110 },
            { key: 'screen', title: '화면', width: 160 },
            { key: 'fieldNm', title: '항목', width: 130, render: (r) => <Text style={s.td}>{r.fieldNm || fieldNameOf(r.fieldKey)}</Text> },
            {
              key: 'result',
              title: '결과',
              width: 90,
              render: (r) => {
                const m = AUDIT_RESULT[r.result] || { label: r.result || '—', tone: '' };
                return <Badge tone={m.tone}>{m.label}</Badge>;
              },
            },
            { key: 'target', title: '비고', flex: 1, minWidth: 180, wrap: true, render: (r) => <Text style={s.td}>{r.target || r.remark || '—'}</Text> },
          ]}
          rows={audit}
        />
        <Pagination meta={auditMeta} {...(auditPaging?.bind || {})} />
      </Card>
    </View>
  );
}
