/**
 * [View] 테스트 발송 결과 본문 — 발송 조건 테스트(ALC-03)·수신 그룹 테스트(RCP-03) 공용
 *
 * 테스트 발송은 실제 발송 경로(대기열 → 엔진)를 탑니다. 화면은 「몇 건을 대기열에 넣었는지」 와
 * 수신 예정자·제외된 사람(사유)을 보여 줍니다. 메일·휴대전화 원문은 응답에 없습니다.
 *
 * 서버가 아직 예전 응답(`sentCnt` 만)을 주면 그 값을 대기 건수로 읽습니다(한 릴리스 병행).
 */
import React from 'react';
import { Text, View } from 'react-native';
import { FormAlert, SourceNote } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 응답 한 건을 화면이 쓰는 모양으로 */
export function normalizeTestResult(d = {}) {
  const queued = Number(d.queuedCnt ?? d.sentCnt ?? 0) || 0;
  const recipients = (d.recipients || []).map((r) => (r && typeof r === 'object' ? r : { name: String(r) }));
  const skipped = (d.skipped || []).map((r) => (r && typeof r === 'object' ? r : { name: String(r) }));
  return { queued, recipients, skipped, channels: d.channels || [], engineStopped: d.engine?.judge === 'STOPPED' };
}

function Row({ cells, head = false, widths }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.divider, paddingVertical: 6 }}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={[s.textSm, { flexBasis: widths[i], flexGrow: i === cells.length - 1 ? 1 : 0, paddingRight: 8 }, head ? { fontWeight: '700', color: theme.color.mutedForeground } : null]}
          numberOfLines={2}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

/**
 * @param {object} props
 * @param {object} props.result normalizeTestResult 결과
 * @param {(code:string)=>string} [props.channelLabel] 채널 코드 → 표기
 * @param {string} [props.note] 맨 아래 출처·안내
 */
export default function AlertTestResult({ result, channelLabel = (c) => c, note }) {
  const s = useCommonStyles();
  const r = result || normalizeTestResult({});
  const name = (x) => x.name || x.empNo || '—';
  return (
    <View testID="alert-test-result">
      <Text style={[s.textSm, { fontWeight: '700', marginBottom: 6 }]}>
        {r.queued
          ? `발송 대기 ${r.queued}건 — 1분 안에 메일이 나갑니다. 결과는 알림 목록의 발송 로그에서 확인합니다.`
          : '발송 대기 0건 — 이 조건으로는 받을 수 있는 사람이 없어 대기열에 넣지 않았습니다.'}
      </Text>
      {r.engineStopped ? <FormAlert tone="error">알림 엔진이 멈춘 것으로 보입니다. 대기열에는 들어갔지만 엔진이 돌아올 때까지 발송되지 않습니다.</FormAlert> : null}

      <Text style={[s.textSm, { fontWeight: '700', marginTop: 10 }]}>{`수신 예정 ${r.recipients.length}명`}</Text>
      {r.recipients.length ? (
        <View>
          <Row head widths={[120, 140, 100]} cells={['이름', '부서', '채널']} />
          {r.recipients.map((x, i) => (
            <Row key={`${x.empNo || i}-${x.channel || ''}`} widths={[120, 140, 100]} cells={[name(x), x.dept || '—', x.channel ? channelLabel(x.channel) : '—']} />
          ))}
        </View>
      ) : (
        <Text style={[s.textSm, { lineHeight: 21 }]}>수신 예정자가 없습니다.</Text>
      )}

      {r.skipped.length ? (
        <>
          <Text style={[s.textSm, { fontWeight: '700', marginTop: 10 }]}>{`제외 ${r.skipped.length}건`}</Text>
          <Row head widths={[120, 200]} cells={['이름', '사유']} />
          {r.skipped.map((x, i) => (
            <Row key={`${x.empNo || 'g'}-${i}`} widths={[120, 200]} cells={[x.name || (x.groupId ? `그룹 ${x.groupId}` : '—'), x.reasonNm || x.reason || '—']} />
          ))}
        </>
      ) : null}

      <SourceNote>{note || '테스트 알림은 알림 목록 기본 조회와 통계에 포함되지 않습니다.'}</SourceNote>
    </View>
  );
}
