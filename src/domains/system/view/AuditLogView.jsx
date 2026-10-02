/**
 * [View] SY-09 보안 감사 로그 (경로: /system/audit-log)
 *
 * 보안 필터링 처리 이력, 사용자 접속 이력, 데이터 접근 이력을 통합 관리합니다.
 * 사용 API — GET /api/v1/audit-logs · POST /api/v1/audit-logs/export(전체 다운로드)
 *
 * ■ 2026-10-01 개편 (기획 09 AUD-05 · 12 · 15 · 17)
 * - 표 9열: 시각·유형·계정·이름·부서·대상·처리 결과·비고·IP. 최소 폭 1,204px — 열을 숨기거나 줄이지 않고
 *   카드 안에서 가로로 밉니다(머리글과 본문이 함께 이동).
 * - 행을 누르면 상세(id·화면·데이터 항목·마스킹 건수·IP·접속 환경·원문 비고)
 * - 엑셀은 옵션 패널([엑셀 다운로드 ▾] → 조회 목록 / 전체)
 * - 조회 실패 시 카드 안 오류 문구와 「다시 시도」 (표·쪽 이동 숨김)
 * - 읽기 전용 화면입니다. 수정·삭제 단추를 두지 않습니다(기록은 고칠 수 없습니다).
 */
import React from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, CheckRow, DateField, ExportMenuButton, Filters, FormAlert, KeyValue, Loading, Pagination, SelectField, SourceNote, Table, TextField,
} from '@shared/components/ui';
import { withAll } from '@domains/common/model/codeRepository';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';

/**
 * 유형 배지 색 — 코드 기준(AUD-09). 해제 요청은 주황, 접근 거부는 빨강, 마스킹·내려받기는 기본(회색), 그 외는 파랑.
 * 예전 목 응답은 표시명으로 주므로 표시명도 봅니다.
 */
function typeTone(type, label) {
  if (type === 'UNMASK_REQ' || String(label).includes('해제')) return 'amber';
  if (type === 'ACCESS_DENIED') return 'red';
  if (type === 'MASK' || type === 'EXPORT' || String(label).includes('마스킹')) return '';
  return 'blue';
}

/** 처리 결과 색 — blind·마스킹 후 제공은 주황, 반려는 빨강, 허용은 기본 */
function resultTone(result) {
  if (result === 'BLIND' || result === 'MASKED') return 'amber';
  if (result === 'REJECT') return 'red';
  return '';
}

/** 보존 정책 원천 표시명 */
const SRC_LABEL = { AUDIT: '감사 기록', PERM: '권한 변경', LOGIN: '로그인 이력' };

const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

/** 표 최소 폭 — 열 정의 폭의 합(150+130+84+90+110+220+120+180+120), 기획 4.3 */
const TABLE_MIN_WIDTH = 1204;

export default function AuditLogView({
  paging, itemsMeta, gridRef, loadError,
  loading, items, filters, deptOptions, typeCodes = [], resultCodes = [], typeLabel, resultLabel,
  setFrom, setTo, setType, setGroup, setResult, setKeyword, setIp, toggleExcludeLoginSuccess, search, reload, exportView, exportAll, loadRetention,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);
  const total = itemsMeta?.total ?? items.length;

  /**
   * 보존 정책 (AUD-11 · AUD-13) — 원천별 보관·경과·아카이브 건수와 배치 일정, 감사 기록 실패 수.
   * 서버 API 가 아직 없으면(null) 「준비 중」 으로 안내합니다.
   */
  const showRetention = async () => {
    let p;
    try {
      p = await loadRetention();
    } catch (e) {
      toast(e?.message || '보존 정책을 불러오지 못했습니다');
      return;
    }
    // 2026-10-02 결정 R-20: 보존 배치를 켭니다(매월 1일 03:00, 3년 경과분을 아카이브 표로 옮김).
    // 서버 설정이 아직 꺼져 있으면(enabled=false) 다음 아카이브 칸만 「서버 설정 꺼짐」 으로 둡니다.
    const off = p ? p.enabled === false : false;
    const sources = Array.isArray(p?.sources) ? p.sources : [];
    const totalKeep = sources.reduce((n, x) => n + (Number(x.totalCnt) || 0), 0);
    openModal({
      title: '감사 로그 보존 정책',
      sub: p ? `현재 ${comma(totalKeep)}건 보관 중` : '서버 준비 중',
      render: () => (
        <View style={{ gap: 10 }}>
          {p ? (
            <>
              <KeyValue
                keyWidth={150}
                rows={[
                  ['보존 기간', p.retentionYears != null ? `${p.retentionYears}년` : '—'],
                  ['마지막 아카이브', p.lastArchiveAt || '—'],
                  ['다음 아카이브', off ? '— (서버 설정 꺼짐)' : p.nextArchiveAt || '—'],
                  // 기록 실패 옆에 메일 발송 실패 수를 함께 둡니다(R-17 — SMTP 계정이 「사용 안 함」 이 되면 여기서 먼저 보입니다)
                  ['기록 실패(기동 후)', `${comma(p.writeFailSinceBoot ?? 0)}건 · 메일 발송 실패 ${comma(p.mailFailSinceBoot ?? 0)}건(기동 후)`],
                ]}
              />
              <Table
                columns={[
                  { key: 'src', title: '원천', width: 110, render: (x) => <Text style={s.td}>{SRC_LABEL[x.src] || x.src}</Text> },
                  { key: 'totalCnt', title: '보관 중', width: 90, align: 'right' },
                  { key: 'expiredCnt', title: '경과(대기)', width: 96, align: 'right' },
                  { key: 'archivedCnt', title: '아카이브', width: 90, align: 'right' },
                  { key: 'oldestAt', title: '가장 오래된 기록', flex: 1, minWidth: 160, mono: true },
                ]}
                rows={sources}
                emptyText="원천별 건수가 없습니다."
              />
              <SourceNote>
                {`보존 기간(${p.retentionYears ?? 3}년)이 지난 기록은 매월 1일 03:00 배치로 아카이브 표로 옮겨집니다. 지우지 않고 옮기는 것이라 되돌릴 수 있으며, 옮긴 기록은 이 목록에서 빠집니다.`}
              </SourceNote>
            </>
          ) : (
            <FormAlert tone="info">보존 정책을 서버에서 받지 못했습니다. 보존 기간은 3년이며, 지난 기록은 매월 1일 03:00 배치로 아카이브 표로 옮겨집니다.</FormAlert>
          )}
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /** 행 상세 — 목록 응답에 이미 있는 값만 씁니다 */
  const showDetail = (r) => {
    const menu = r.menuNm || r.menuId ? `${r.menuNm || r.menuId}${r.menuId && r.menuNm ? ` (${r.menuId})` : ''}` : '—';
    const actor = r.empNo ? `${r.empNo} ${r.name || '(삭제된 계정)'}${r.dept ? ` (${r.dept})` : ''}` : '— (비로그인 사건)';
    openModal({
      title: `감사 기록 ${r.id || ''}`.trim(),
      sub: `${typeLabel(r.type)} · ${r.result ? resultLabel(r.result) : '—'}`,
      render: () => (
        <KeyValue
          keyWidth={120}
          rows={[
            ['시각', dash(r.ts)],
            ['유형 · 결과', `${typeLabel(r.type)} · ${r.result ? resultLabel(r.result) : '—'}`],
            ['행위자', actor],
            ['화면', menu],
            ['데이터 항목', dash(r.fieldKey)],
            ['마스킹 건수', r.maskedCnt != null ? comma(r.maskedCnt) : '—'],
            ['대상', dash(r.target)],
            ['비고', dash(r.detail)],
            ['IP', dash(r.ip)],
            ['접속 환경', dash(r.ua)],
          ]}
        />
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  return (
    <View>
      <PageHead
        title="보안 감사 로그"
        desc="로그인·권한 변경·마스킹·내려받기·설정 변경을 한 타임라인으로 봅니다. 기록은 고칠 수 없습니다."
        actions={
          <>
            <Button label="보존 정책" size="sm" icon="shield" onPress={showRetention} />
            <ExportMenuButton
              viewCount={items.length}
              onExportView={exportView}
              onExportAll={exportAll}
              disabled={loading && !items.length}
            />
          </>
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="유형" value={filters.type} options={withAll(typeCodes)} onChange={setType} />
        <SelectField label="결과" value={filters.result} options={withAll(resultCodes)} onChange={setResult} />
        <SelectField label="부서" value={filters.group} options={deptOptions} onChange={setGroup} />
        <TextField
          label="계정·검색어"
          value={filters.keyword}
          onChangeText={setKeyword}
          placeholder="사번·이름·대상·비고"
          onSubmitEditing={search}
          accessibilityLabel="계정·검색어"
        />
        <TextField
          label="IP"
          value={filters.ip}
          onChangeText={setIp}
          placeholder="예) 10.1.2.3 · 10.0.0.0/8 · 10.1."
          onSubmitEditing={search}
          accessibilityLabel="IP"
        />
        <CheckRow label="로그인 성공 제외" checked={!!filters.excludeLoginSuccess} onToggle={toggleExcludeLoginSuccess} style={{ alignSelf: 'flex-end', paddingBottom: 10 }} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card title="감사 로그" sub={loadError ? '조회 실패' : `${comma(total)}건 · ${filters.from} ~ ${filters.to}`} tight>
        {loadError ? (
          <View style={{ padding: 16, gap: 10 }}>
            <FormAlert tone="error">{`감사 로그를 불러오지 못했습니다 — ${loadError.message || '잠시 후 다시 시도해 주세요.'}`}</FormAlert>
            <Button label="다시 시도" onPress={reload} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : loading ? (
          <Loading />
        ) : (
          <Table
            inset
            minWidth={TABLE_MIN_WIDTH}
            instanceRef={gridRef}
            keyExtractor={(r, i) => r.id || `${r.ts}-${i}`}
            onRowPress={showDetail}
            emptyText="조회 조건에 맞는 감사 기록이 없습니다. 기간을 넓히거나 조건을 줄여 보세요."
            columns={[
              { key: 'ts', title: '시각', width: 150, mono: true },
              {
                key: 'type',
                title: '유형',
                width: 130,
                render: (r) => {
                  const label = typeLabel(r.type);
                  return <Badge tone={typeTone(r.type, label)}>{label}</Badge>;
                },
              },
              { key: 'empNo', title: '계정', width: 84, mono: true },
              { key: 'name', title: '이름', width: 90 },
              { key: 'dept', title: '부서', width: 110 },
              { key: 'target', title: '대상', flex: 2, minWidth: 220, wrap: true },
              {
                key: 'result',
                title: '처리 결과',
                width: 120,
                render: (r) => (r.result ? <Badge tone={resultTone(r.result)}>{resultLabel(r.result)}</Badge> : <Text style={s.td}>—</Text>),
              },
              { key: 'detail', title: '비고', flex: 1, minWidth: 180, wrap: true },
              { key: 'ip', title: 'IP', width: 120, mono: true },
            ]}
            rows={items}
          />
        )}
        {loadError ? null : <Pagination meta={itemsMeta} {...(paging?.bind || {})} />}
      </Card>
    </View>
  );
}
