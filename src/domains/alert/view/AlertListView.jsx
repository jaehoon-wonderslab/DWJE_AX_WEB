/**
 * [View] AL-01 알림 목록·상세 (경로: /alert/list)
 *
 * 임계값을 넘은 건과 패턴 이상을 목록으로 관리합니다.
 * 사용 API 4건 — /api/v1/alerts/* (승격 대상 조회는 2026-10-03 에 없앴습니다)
 *
 * 목록 응답: alertId · level · levelNm · title · occurredAt · elapsed · eqptCd · eqptNm · processId · lotNo · itemCd
 *           · defectCd · desc · condNm · ackState · ackBy · ackAt · escLevel · agent
 * 응답에 없는 필드로는 열을 그리지 않습니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, BlindValue, Button, Card, Dot, EmptyState, Filters, Hint, KeyValue, Loading, Pagination, SelectField, Table, Tabs, TextAreaField,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { alertLevelTone, alertLinkOf, isAcked } from '../model/alertRepository';

const PERIOD_OPTIONS = ['오늘', '최근 7일', '최근 30일'];

/** 값이 없으면 '—' */
const text = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

/** 대상 설비 — 이름을 우선 보여 주고, 코드만 있으면 코드, 둘 다 없으면 '—' */
const targetText = (a) => a?.eqptNm || a?.eqptCd || '—';

/** 발송 결과 → 배지 색 (서버가 표시명 또는 코드로 줍니다) */
function sendResultTone(result) {
  const v = String(result ?? '').toUpperCase();
  if (['발송', 'SENT', '성공', 'OK', 'SUCCESS'].includes(v)) return 'green';
  if (['실패', 'FAIL', 'FAILED', 'ERROR'].includes(v)) return 'red';
  return 'amber';
}

export default function AlertListView({
  loading, items, counts = {}, sendLogs = [], canSendLog: canSendLogProp,
  tab, setTab, filters, equipments = [], severityOptions = ['전체'],
  severityLabel = (v) => v, ackStateLabel = (v) => v, channelLabel = (v) => v, sendResultLabel = (v) => v,
  setType, setTarget, setPeriod, reload, search, loadDetail, acknowledge, exportExcel, paging, itemsMeta,
  link = null, focusAlertId = '', clearLink,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const canSendLog = canSendLogProp ?? (can('alert-cond') || can('sys-recip'));
  const { goToScreen, goToPath } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 상세가 가리키는 화면으로 — 상세에 link 가 있으면 그곳, 없고 설비가 있으면 생산 모니터링 */
  const openRelated = (alert) => {
    const link = alertLinkOf(alert);
    if (link?.path) return goToPath(link.path);
    if (link?.screenId) return goToScreen(link.screenId);
    if (alert?.eqptCd) return goToScreen('prod-monitor');
    return null;
  };
  const hasRelated = (alert) => !!alertLinkOf(alert) || !!alert?.eqptCd;

  /** 알림 상세 · 확인 처리 */
  const openDetail = async (row) => {
    try {
      const alert = { ...row, ...(await loadDetail(row.alertId)) };
      openModal({
        title: alert.title || alert.condNm || `알림 #${alert.alertId}`,
        sub: [targetText(alert) !== '—' ? targetText(alert) : alert.target, alert.occurredAt, alert.agent ? `${alert.agent} Agent` : null].filter(Boolean).join(' · '),
        render: (close) => (
          <AlertDetail
            alert={alert}
            severityLabel={severityLabel}
            ackStateLabel={ackStateLabel}
            onAck={async (note) => {
              const r = await acknowledge(alert.alertId, note);
              if (r.ok) close();
            }}
          />
        ),
        footer: (close) => (
          <>
            <Button label="닫기" onPress={close} />
            {hasRelated(alert) ? (
              <Button
                label="관련 화면 열기"
                icon="external"
                onPress={() => {
                  close();
                  openRelated(alert);
                }}
              />
            ) : null}
          </>
        ),
      });
    } catch (e) {
      toast(e?.message || '알림 상세를 불러오지 못했습니다');
    }
  };

  const countText = (n) => (n === null || n === undefined ? '' : ` ${comma(n)}`);

  // 주소로 건너온 알림(alertId)은 목록에 그 한 건이 오면 상세를 한 번 바로 엽니다
  const focused = useRef('');
  useEffect(() => {
    if (!focusAlertId || focused.current === focusAlertId) return;
    const row = items.find((a) => String(a.alertId) === String(focusAlertId));
    if (!row) return;
    focused.current = focusAlertId;
    openDetail(row);
  }, [focusAlertId, items]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View>
      <PageHead
        title="알림 목록·상세"
        desc="임계값을 넘은 건과 패턴 이상을 목록으로 관리합니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!items.length} />
            {can('alert-cond') ? <Button label="발송 조건 관리" size="sm" icon="settings" onPress={() => goToScreen('alert-cond')} /> : null}
          </>
        }
      />

      {link ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Hint style={{ flex: 1, minWidth: 240 }}>
            {[
              link.alertId ? `알림 #${link.alertId} 한 건을 보고 있습니다` : `발송 조건 #${link.condId} 의 알림만 보고 있습니다`,
              link.includeTest ? '테스트 알림 포함' : null,
            ].filter(Boolean).join(' · ')}
          </Hint>
          {clearLink ? <Button label="모든 알림 보기" size="sm" onPress={clearLink} /> : null}
        </View>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: '미확인', label: `미확인${countText(counts.unread)}` },
          { value: '확인됨', label: `확인됨${countText(counts.read)}` },
          { value: '전체', label: '전체' },
        ]}
      />

      <Filters>
        {/* 심각도는 공통코드 ALM_SEVERITY(CRIT|WARN|LOW) 값을 그대로 보냅니다 */}
        <SelectField label="심각도" value={filters.type} options={severityOptions} onChange={setType} />
        <SelectField label="설비" value={filters.target} options={['전체', ...equipments]} onChange={setTarget} />
        <SelectField label="기간" value={filters.period} options={PERIOD_OPTIONS} onChange={setPeriod} />
        <Button label="조회" variant="primary" onPress={search || reload} />
      </Filters>

      <Card title="알림 목록" sub={`${tab} · ${filters.period} · 전체 ${comma(itemsMeta?.total ?? items.length)}건 · 행을 누르면 상세를 봅니다`} tight>
        {loading && !items.length ? (
          <Loading />
        ) : (
          <Table
            inset
            minWidth={940}
            keyExtractor={(r) => r.alertId}
            onRowPress={openDetail}
            emptyText="해당 조건의 알림이 없습니다."
            columns={[
              {
                key: 'level',
                title: '등급',
                width: 86,
                render: (r) => (
                  <View style={[s.rowGap6, { paddingHorizontal: 14 }]}>
                    <Dot tone={alertLevelTone(r.level)} />
                    <Text style={s.textSm}>{r.levelNm || severityLabel(r.level)}</Text>
                  </View>
                ),
              },
              {
                key: 'title',
                title: '알림 제목',
                flex: 1.6,
                minWidth: 220,
                render: (r) => (
                  <View style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Text style={[s.textSm, { fontWeight: '600', flexShrink: 1 }]} numberOfLines={2}>{text(r.title)}</Text>
                      {r.test ? <Badge tone="blue">테스트</Badge> : null}
                    </View>
                    {r.condNm && r.condNm !== r.title ? <Text style={s.textXs} numberOfLines={1}>{`조건 ${r.condNm}`}</Text> : null}
                  </View>
                ),
              },
              { key: 'eqptCd', title: '대상', width: 130, render: (r) => <Text style={[s.td, !r.eqptNm && s.num]} numberOfLines={1}>{targetText(r)}</Text> },
              {
                key: 'desc',
                title: '내용',
                flex: 1,
                minWidth: 170,
                render: (r) => {
                  const tags = [r.lotNo ? `LOT ${r.lotNo}` : null, r.itemCd ? `품목 ${r.itemCd}` : null, r.defectCd ? `불량 ${r.defectCd}` : null].filter(Boolean);
                  return (
                    <View style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                      <Text style={s.textSm} numberOfLines={2}>{text(r.desc)}</Text>
                      {tags.length ? <Text style={[s.textXs, s.num]} numberOfLines={1}>{tags.join(' · ')}</Text> : null}
                    </View>
                  );
                },
              },
              { key: 'agent', title: '감지 Agent', width: 120, render: (r) => <Text style={s.td} numberOfLines={1}>{text(r.agent)}</Text> },
              {
                key: 'occurredAt',
                title: '발생',
                width: 128,
                render: (r) => (
                  <View style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={[s.textSm, s.num]}>{r.elapsed ? `${r.elapsed} 전` : text(r.occurredAt)}</Text>
                    {r.elapsed ? <Text style={[s.textXs, s.num]} numberOfLines={1}>{text(r.occurredAt)}</Text> : null}
                  </View>
                ),
              },
              {
                key: 'ackState',
                title: '상태',
                width: 110,
                render: (r) =>
                  isAcked(r.ackState) ? (
                    <View style={{ paddingHorizontal: 14 }}>
                      <Badge tone="green">{ackStateLabel(r.ackState)}</Badge>
                      {r.ackBy ? <Text style={[s.textXs, { marginTop: 2 }]} numberOfLines={1}>{r.ackBy}</Text> : null}
                    </View>
                  ) : (
                    <View style={{ paddingHorizontal: 10 }}>
                      <Button label="확인" size="sm" onPress={() => openDetail(r)} />
                    </View>
                  ),
              },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
      <Gap />

      {/* 「승격 대기」 카드는 뺐습니다(2026-10-03) — 엔진이 승격하지 않고 승격 규칙 설정도 없앴습니다 */}

      {canSendLog ? (
        <>
          <Gap />
          <Card title="알림 발송 로그" sub="최근 발송 내역 (알림 발송 조건·수신자 관리 권한)" tight>
            <Table
              inset
              minWidth={860}
              keyExtractor={(r, i) => r.sendId ?? `${r.ts}-${i}`}
              emptyText="발송 내역이 없습니다."
              columns={[
                { key: 'ts', title: '발송 시각', width: 150, render: (r) => <Text style={[s.td, s.num]}>{text(r.ts)}</Text> },
                {
                  key: 'alertTitle',
                  title: '알림 · 발송 조건',
                  flex: 1.4,
                  minWidth: 200,
                  render: (r) => (
                    <View style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                      <Text style={s.textSm} numberOfLines={1}>{text(r.alertTitle)}</Text>
                      {r.condNm ? <Text style={s.textXs} numberOfLines={1}>{`조건 ${r.condNm}`}</Text> : null}
                    </View>
                  ),
                },
                { key: 'channel', title: '채널', width: 110, render: (r) => <Text style={s.td}>{text(channelLabel(r.channel))}</Text> },
                { key: 'recipient', title: '수신자', flex: 1, minWidth: 150, render: (r) => <Text style={s.td} numberOfLines={1}>{text(r.recipient)}</Text> },
                { key: 'delaySec', title: '지연', width: 72, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.delaySec === null || r.delaySec === undefined ? '—' : `${r.delaySec}초`}</Text> },
                {
                  key: 'result',
                  title: '결과',
                  width: 150,
                  render: (r) => (
                    <View style={{ paddingHorizontal: 14 }}>
                      {/* 테스트 발송 기록은 운영 발송과 구분해 표시합니다 (기획 05 ALC-03 · 응답 test 필드) */}
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        <Badge tone={sendResultTone(r.result)}>{text(sendResultLabel(r.result))}</Badge>
                        {r.test ? <Badge tone="blue">테스트</Badge> : null}
                      </View>
                      {r.failReason ? <Text style={[s.textXs, { marginTop: 2, color: theme.color.destructive }]} numberOfLines={1}>{r.failReason}</Text> : null}
                    </View>
                  ),
                },
              ]}
              rows={sendLogs}
            />
          </Card>
        </>
      ) : null}
    </View>
  );
}

/**
 * 알림 상세 · 조치 입력
 *
 * 상세 응답: level · title · occurredAt · basisValue · threshold · evidence · target · eqptCd · eqptNm · moldCd
 *           · processId · itemCd · lotNo · serialNo · mainDefectType · ackState · ackBy · ackAt · ackNote · escLevel
 *           · agent · causeCandidates[] · recentHistory[] · recommendation · condNm · metricDesc
 * 근거 수치는 yield, 금형은 mold 마스킹 대상입니다.
 */
function AlertDetail({ alert, severityLabel, ackStateLabel, onAck }) {
  const s = useCommonStyles();
  const [note, setNote] = useState(alert.ackNote || '');
  const acked = isAcked(alert.ackState);

  const basis =
    alert.basisValue === null || alert.basisValue === undefined
      ? alert.evidence || alert.desc || '—'
      : `${alert.basisValue}${alert.threshold === null || alert.threshold === undefined ? '' : ` / 임계 ${alert.threshold}`}`;

  const causes = Array.isArray(alert.causeCandidates)
    ? alert.causeCandidates.map((c) => (typeof c === 'string' ? c : c?.name || c?.cause || c?.reasonNm || JSON.stringify(c))).filter(Boolean)
    : [];

  const rows = [
    ['등급', <View style={s.rowGap6}><Dot tone={alertLevelTone(alert.level)} /><Text style={s.kvVal}>{alert.levelNm || severityLabel(alert.level)}</Text></View>],
    ['대상 설비', alert.eqptCd ? `${alert.eqptCd}${alert.eqptNm ? ` (${alert.eqptNm})` : ''}` : alert.eqptNm || alert.target || '—'],
    alert.moldCd ? ['금형', <BlindValue field="mold" value={alert.moldCd} textStyle={s.kvVal} />] : null,
    alert.processId ? ['공정', alert.processId] : null,
    ['대상 LOT', text(alert.lotNo)],
    alert.itemCd ? ['품목', alert.itemCd] : null,
    alert.serialNo ? ['시리얼', alert.serialNo] : null,
    alert.condNm ? ['발송 조건', `${alert.condNm}${alert.metricDesc && alert.metricDesc !== alert.condNm ? ` · ${alert.metricDesc}` : ''}`] : null,
    ['근거 수치', <BlindValue field="yield" value={basis} textStyle={s.kvVal} />],
    ['주 불량 유형', text(alert.mainDefectType || alert.defectCd)],
    ['원인 후보', causes.length ? causes.join(' · ') : '—'],
    ['권고 조치', text(alert.recommendation)],
    ['발생 시각', text(alert.occurredAt)],
    ['상태', acked ? `${ackStateLabel(alert.ackState)}${alert.ackBy ? ` · ${alert.ackBy}` : ''}${alert.ackAt ? ` · ${alert.ackAt}` : ''}` : '미확인'],
  ].filter(Boolean);

  return (
    <View>
      <KeyValue keyWidth={100} rows={rows} />

      {Array.isArray(alert.recentHistory) && alert.recentHistory.length ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[s.fieldLabel, { marginBottom: 5 }]}>최근 이력</Text>
          {alert.recentHistory.slice(0, 5).map((h, i) => (
            <Text key={i} style={s.textXs} numberOfLines={1}>
              {typeof h === 'string' ? h : [h?.ts || h?.occurredAt, h?.title || h?.desc || h?.state].filter(Boolean).join(' · ')}
            </Text>
          ))}
        </View>
      ) : null}

      {acked ? (
        alert.ackNote ? <Text style={[s.textSm, { marginTop: 12 }]}>{`조치 내용: ${alert.ackNote}`}</Text> : null
      ) : (
        <>
          <TextAreaField label="조치 내용" value={note} onChangeText={setNote} rows={2} placeholder="확인 후 조치 내용을 입력하세요" />
          <Text style={[s.sourceText, { marginTop: 12 }]}>미확인 상태가 지속되면 상위 담당으로 자동 전달됩니다.</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
            <Button label="확인 처리" variant="primary" onPress={() => onAck(note)} />
          </View>
        </>
      )}
    </View>
  );
}
