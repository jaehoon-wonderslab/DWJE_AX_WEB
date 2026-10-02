/**
 * [View] SY-14 보고서 다운로드 이력 (경로: /system/download-log)
 *
 * 인쇄·PDF 출력도 함께 기록되며, 권한 밖 값은 파일에 「비공개」 로 채워진 채 그 셀 수가 남습니다.
 * 사용 API — /api/v1/download-logs/* (요약·목록·상세·보존 정책·전체 내려받기)
 *
 * ■ 2026-09-08 개편
 * - 요약 카드는 누적·금일 2종만 (blind 포함 · 최다 이용 카드와 보조 문구는 뺐습니다)
 * - 계정별 이용 카드 제거
 * - 이력 표는 `TabulatorGrid` — 쪽을 나누지 않고 조회 조건에 맞는 기록을 전부 놓습니다 (정렬·열 폭 조절 가능)
 * - 계정(사번) · 이름 · 부서, 보고서 · 화면을 각각 다른 칸에 둡니다
 *
 * ■ 2026-10-01 개편 (기획 10 DLG-03 · 05 · 06 · 08 · 10 · 12 · 15 · 16)
 * - 요약 카드 이름 「조회 기간」·「금일」(「누적」 은 보존 정책 모달의 보관 건수에만 씁니다)
 * - 표 13열: 「화면」 은 menuId, 「범위」(조회 목록·전체·—)·「출처」(브라우저·서버) 추가,
 *   「대상 범위」 → 「조회 조건」(condSummary). IP 가 마지막 열. 열을 숨기지 않고 표 안에서 가로로 밉니다.
 * - 필터: 화면 · 부서 · 형식 · 범위 · 출처 · 계정·검색어 · blind 포함만
 * - 엑셀 옵션 패널([엑셀 다운로드 ▾] → 조회 목록 / 전체), 행 상세(생성 조건 · 제외된 항목 · 비공개 건수 비교)
 * - 화면 전체 Loading 을 없애고 카드 안에서만 로딩 · 오류를 보입니다(필터가 사라지지 않게)
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, CheckRow, DateField, ExportMenuButton, Filters, FormAlert, KeyValue, Loading, SelectField, SourceNote, StatCard, TabulatorGrid, TextField,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';
import { ALL_SIZE, isAttrsMissing, originLabel, scopeLabel, screenInfo } from '../controller/useDownloadLogController';

export default function DownloadLogView({
  loading, items, total = 0, capped, summary, summaryError, loadError, gridRef, viewCount, totalCount,
  filters, screenOptions = [], deptOptions = [], formatOptions = [], scopeOptions = [], originOptions = [], formatLabel = (v) => v,
  setFrom, setTo, setMenuId, setDeptId, setFormat, setScopeCd, setOrigin, setKeyword, toggleBlindOnly, search, reload,
  exportView, exportAll, loadDetail, loadPolicy,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);

  /**
   * 보존 정책 — 응답은 { retentionYears, enabled, totalCnt, expiredCnt, archivedCnt, oldestAt, lastArchiveAt, nextArchiveAt } 입니다.
   * archivedCnt 는 2026-10 부터 「아카이브 표 건수」 입니다(예전엔 경과 건수 — 그 값은 archiveTargetCnt).
   */
  const showPolicy = async () => {
    const policy = await loadPolicy().catch(() => null);
    if (!policy) {
      toast('보존 정책을 불러오지 못했습니다');
      return;
    }
    const keep = policy.totalCnt ?? summary?.total ?? items.length;
    const off = policy.enabled === false;
    const rows = [
      ['보존 기간', policy.retentionYears != null ? `${policy.retentionYears}년` : '—'],
      ['보관 중', `${comma(keep)}건`],
      ['보존 기간 경과(아카이브 대기)', `${comma(policy.expiredCnt ?? policy.archiveTargetCnt ?? 0)}건`],
      ['아카이브 보관', `${comma(policy.archivedCnt ?? 0)}건`],
      ['가장 오래된 기록', policy.oldestAt || '—'],
      ['마지막 아카이브', policy.lastArchiveAt || '—'],
      ['다음 아카이브', off ? '— (서버 설정 꺼짐)' : policy.nextArchiveAt || '—'],
    ];
    openModal({
      title: '다운로드 이력 보존 정책',
      sub: `현재 ${comma(keep)}건 보관 중`,
      render: () => (
        <View>
          <KeyValue keyWidth={170} rows={rows} />
          <SourceNote>
            {/* 2026-10-02 결정 R-20: 감사 로그와 같은 배치(매월 1일 03:00)로 3년 경과분을 아카이브합니다 */}
            {`보존 기간(${policy.retentionYears ?? 3}년)이 지난 기록은 비공개 내역과 함께 매월 1일 03:00 배치로 아카이브 표로 옮겨집니다. 지우지 않고 옮기는 것이라 되돌릴 수 있으며, 옮긴 기록은 이 목록에서 빠집니다.`}
          </SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /** 기록 상세 — 생성 조건(params)·제외된 항목(blindFields)·비공개 건수 비교 (DLG-10 · DLG-15) */
  const showDetail = async (row) => {
    const d = await loadDetail(row);
    const info = screenInfo(d.menuId);
    const params = parseParams(d.params);
    const blindFields = Array.isArray(d.blindFields) ? d.blindFields : [];
    // 서버가 비교 결과를 주면(blindCellSum · blindMismatch · blindBasis, 3단계) 그 값을, 없으면 화면이 셉니다
    const fieldSum = d.blindCellSum ?? blindFields.reduce((n, f) => n + (Number(f.cellCnt) || 0), 0);
    const mismatch = typeof d.blindMismatch === 'boolean' ? d.blindMismatch : blindFields.length > 0 && fieldSum !== Number(d.blindCnt || 0);
    // 2026-10 이전 서버 기록은 blind_cnt 가 「항목 키 수」 였습니다(기획 10 8장 18) — 셀 수와 비교하지 않고 표시만 합니다
    const legacy = d.blindBasis === 'LEGACY';
    openModal({
      title: `내려받기 기록 #${d.dlId ?? '—'}`,
      sub: `${d.ts || ''} · ${d.empNo || '—'} ${d.name || ''}`.trim(),
      render: () => (
        <View style={{ gap: 12 }}>
          {d.detailMissing ? <FormAlert tone="info">{`상세를 불러오지 못해 목록 값만 보여 줍니다${d.detailError ? ` — ${d.detailError}` : ''}.`}</FormAlert> : null}
          <KeyValue
            keyWidth={120}
            rows={[
              ['일시', d.ts || '—'],
              ['계정', `${d.empNo || '—'}${d.name ? ` ${d.name}` : ''}${d.dept ? ` (${d.dept})` : ''}`],
              ['화면', info ? `${info.name}${info.path ? ` (${info.path})` : ''}` : '—'],
              ['보고서', d.report || '—'],
              ['형식', formatLabel(d.format)],
              ['출처', originLabel(d.origin)],
              ['범위 · 조회 조건', `${scopeLabel(d.scopeCd)} · ${d.condSummary || '—'}`],
              ['행 수', d.rowCnt != null ? comma(d.rowCnt) : '—'],
              [
                '비공개 처리',
                <Text key="blind" style={[s.kvVal, mismatch && !legacy ? { color: '#b45309', fontWeight: '700' } : null]}>
                  {legacy
                    ? `${comma(d.blindCnt ?? 0)}건(항목 수 기준(구) — 2026-10 이전 서버 기록)`
                    : `${comma(d.blindCnt ?? 0)}건(셀)${blindFields.length || d.blindCellSum != null ? ` · 항목별 합계 ${comma(fieldSum)}건${mismatch ? ' — 항목별 합계와 다름' : ''}` : ''}`}
                </Text>,
              ],
              ['파일', `${d.fileNm || '—'}${d.fileSize != null ? ` (${comma(d.fileSize)} byte)` : ''}`],
              ['IP', d.ip || '—'],
            ]}
          />
          <Text style={[s.textSm, { fontWeight: '700' }]}>생성 조건</Text>
          {params.length ? (
            <KeyValue keyWidth={120} rows={params} />
          ) : (
            <Text style={s.caption}>{d.origin === 'CLIENT' || !d.origin ? '생성 조건 없음(브라우저 생성)' : '생성 조건 없음'}</Text>
          )}
          <Text style={[s.textSm, { fontWeight: '700' }]}>제외된 항목</Text>
          {blindFields.length ? (
            <KeyValue keyWidth={160} rows={blindFields.map((f) => [`${f.fieldNm || f.fieldKey}${f.fieldKey ? ` (${f.fieldKey})` : ''}`, `셀 ${comma(f.cellCnt ?? 0)}`])} />
          ) : (
            <Text style={s.caption}>제외된 항목 없음</Text>
          )}
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /**
   * 이력 표 열 — 행 자료는 응답 그대로 두고(정렬은 원본 값으로) 보이는 모양만 formatter 로 만듭니다.
   * formatLabel 은 공통코드(RPT_FORMAT)가 도착하면 바뀌므로 의존성에 넣습니다 — 그때 한 번 표가 다시 만들어집니다.
   * 최소 폭 합 1,610px(기획 4.3) — 열을 숨기거나 줄이지 않고 표 안에서 가로로 밉니다.
   */
  const columns = useMemo(() => [
    { title: '일시', field: 'ts', minWidth: 150, formatter: monoFmt },
    // 계정(사번) · 이름 · 부서를 각각 다른 칸에 — 예전에는 이름 하나로 합쳐 보였습니다
    { title: '계정', field: 'empNo', width: 84, formatter: monoFmt },
    { title: '이름', field: 'name', width: 90, formatter: dashFmt },
    { title: '부서', field: 'dept', minWidth: 110, formatter: dashFmt },
    // 보고서(내려받은 파일·보고서 이름)와 화면(내려받은 화면)을 따로 — 예전에는 「보고서 · 화면」 한 칸이었습니다
    { title: '보고서', field: 'report', minWidth: 220, widthGrow: 2, formatter: (cell) => esc(dash(cell.getValue() || cell.getData().reportName)) },
    {
      // 메뉴명 위에, 페이지 URL 을 옅게 아래에 — 어느 화면에서 내려받았는지 이름과 주소로 함께 봅니다
      // 2026-10-01: 필드를 reportId → menuId 로 (DLG-03)
      title: '화면',
      field: 'menuId',
      minWidth: 170,
      formatter: (cell) => {
        const info = screenInfo(cell.getValue());
        if (!info) return '—';
        return `${esc(info.name)}${info.path ? `<div class="muted mono">${esc(info.path)}</div>` : ''}`;
      },
    },
    { title: '형식', field: 'format', width: 110, formatter: (cell) => esc(formatLabel(cell.getValue())) },
    { title: '범위', field: 'scopeCd', width: 96, formatter: (cell) => esc(scopeLabel(cell.getValue())) },
    {
      // 예전 「대상 범위」(scope 문구) — 2026-10-01 「조회 조건」(condSummary)으로. attrs 없이 만든 파일은 표시합니다(DLG-15)
      title: '조회 조건',
      field: 'condSummary',
      minWidth: 200,
      formatter: (cell) => {
        const miss = isAttrsMissing(cell.getData().params) ? ' <span class="tag tag-amber">attrs 누락</span>' : '';
        return `<span class="muted">${esc(dash(cell.getValue()))}</span>${miss}`;
      },
    },
    { title: '행 수', field: 'rowCnt', width: 80, hozAlign: 'right', sorter: 'number', formatter: (cell) => `<span class="num">${cell.getValue() != null ? comma(cell.getValue()) : '—'}</span>` },
    { title: 'blind 항목', field: 'blindCnt', width: 104, sorter: 'number', formatter: (cell) => (cell.getValue() ? `<span class="tag tag-amber">${comma(cell.getValue())}건</span>` : '—') },
    { title: '출처', field: 'origin', width: 80, formatter: (cell) => esc(originLabel(cell.getValue())) },
    { title: 'IP', field: 'ip', width: 116, formatter: monoFmt },
  ], [formatLabel]);

  // 화면 전체 Loading 은 없앴습니다(DLG-12) — 첫 진입에도 머리글·필터는 보이고, 카드 안에서만 로딩을 보입니다
  const sub = capped
    ? `전체 ${comma(total)}건 중 최근 ${comma(items.length)}건 — 전량은 엑셀 다운로드로 받으세요 · 열 제목으로 정렬할 수 있습니다`
    : `전체 ${comma(total)}건 중 최근 ${comma(items.length)}건 · 열 제목으로 정렬할 수 있습니다`;

  return (
    <View>
      <PageHead
        title="보고서 다운로드 이력"
        desc="보고서·화면에서 내려받은 파일과 인쇄 기록을 계정 단위로 봅니다. 권한 밖 값은 파일에 「비공개」 로 채워지며, 기록은 고칠 수 없습니다."
        actions={
          <>
            <ExportMenuButton viewCount={viewCount} totalCount={totalCount} onExportView={exportView} onExportAll={exportAll} />
            <Button label="보존 정책" size="sm" icon="shield" onPress={showPolicy} />
          </>
        }
      />

      {/* blind 포함 · 최다 이용 카드와 보조 문구(행 수 · 오늘 날짜)는 2026-09-08 요청으로 뺐습니다 */}
      <Grid cols={2}>
        <StatCard label="조회 기간" value={summary && !summaryError ? comma(summary.total ?? 0) : '—'} unit="건" />
        <StatCard label="금일" value={summary && !summaryError ? comma(summary.today ?? 0) : '—'} unit="건" />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="화면" value={filters.menuId} options={screenOptions} onChange={setMenuId} />
        <SelectField label="부서" value={filters.deptId} options={deptOptions} onChange={setDeptId} />
        <SelectField label="형식" value={filters.format} options={formatOptions} onChange={setFormat} />
        <SelectField label="범위" value={filters.scopeCd} options={scopeOptions} onChange={setScopeCd} />
        <SelectField label="출처" value={filters.origin} options={originOptions} onChange={setOrigin} />
        <TextField
          label="계정·검색어"
          value={filters.keyword}
          onChangeText={setKeyword}
          placeholder="사번·이름·보고서명·조건"
          onSubmitEditing={search}
          accessibilityLabel="계정·검색어"
        />
        <CheckRow label="blind 포함만" checked={!!filters.blindOnly} onToggle={toggleBlindOnly} style={{ alignSelf: 'flex-end', paddingBottom: 10 }} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {/* 쪽을 나누지 않습니다 — 조회 조건에 맞는 기록을 전부 놓고, 많으면 표 안에서 스크롤합니다 */}
      <Card title="다운로드 이력" sub={loadError ? '조회 실패' : sub}>
        {loadError ? (
          <View style={{ gap: 10 }}>
            <FormAlert tone="error">{`다운로드 이력을 불러오지 못했습니다 — ${loadError.message || '잠시 후 다시 시도해 주세요.'}`}</FormAlert>
            <Button label="다시 시도" onPress={reload} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : loading && !items.length ? (
          <Loading />
        ) : (
          <TabulatorGrid
            columns={columns}
            rows={items}
            instanceRef={gridRef}
            onRowClick={showDetail}
            tableOptions={TABLE_OPTIONS}
            height={items.length > 14 ? 620 : undefined}
            emptyText="조회 조건에 맞는 내려받기 기록이 없습니다."
          />
        )}
        {capped && !loadError ? <Badge tone="amber" style={{ marginTop: 8, alignSelf: 'flex-start' }}>{`한 번에 ${comma(ALL_SIZE)}건까지 표시`}</Badge> : null}
      </Card>
    </View>
  );
}

/** 열 순서를 사람이 옮길 수 있게 합니다 — 「조회 목록」 파일도 그 순서를 따릅니다(DLG-16) */
const TABLE_OPTIONS = { movableColumns: true };

/** 생성 조건 — params 는 JSON 문자열이거나 객체입니다. 키·값 줄로 바꿉니다 */
function parseParams(p) {
  if (!p) return [];
  let obj = p;
  if (typeof p === 'string') {
    try { obj = JSON.parse(p); } catch (e) { return [['조건', p]]; }
  }
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj)
    .filter(([k]) => k !== 'note')
    .map(([k, v]) => [k, v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)]);
}

/* ───────── Tabulator 셀 HTML 도우미 — 값은 서버 문자열이므로 이스케이프해서 넣습니다 ───────── */

/** HTML 특수문자 이스케이프 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/** 빈 값은 대시로 */
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

const dashFmt = (cell) => esc(dash(cell.getValue()));
const monoFmt = (cell) => `<span class="mono">${esc(dash(cell.getValue()))}</span>`;
