/**
 * 이상 알림 목 데이터 (AL-01)
 */

export const ALERTS = [
  {
    alertId: 'AL-260828-0912', level: 'red', title: '불량률 임계 초과', target: 'PR-03', targetName: 'A-프레스 3호기',
    metric: '4.1% (임계 3.0%)', agent: '⑨ 이상 알림', occurredAt: '2026-08-28 09:04', elapsed: '8분 전',
    state: '미확인', type: '불량률 초과',
    detail: {
      lotNo: 'L260824-031',
      basis: '최근 2시간 불량률 4.1% (임계 3.0%)',
      mainDefect: 'chip (찍힘) 412건',
      causeCandidate: '각도 편차 확대 (기여도 72) · 금형 교체 후 42분 경과',
      recommendation: '금형 교체 후 초기 각도 조건 재설정 검토',
      link: 'qc-aoi',
    },
  },
  {
    alertId: 'AL-260828-0849', level: 'amber', title: '경계 판정 누적', target: 'AOI-07', targetName: 'AOI 7호기',
    metric: '12건 미검토', agent: '③ 불량 판정', occurredAt: '2026-08-28 08:49', elapsed: '23분 전',
    state: '미확인', type: '패턴 이상',
    detail: {
      lotNo: '—',
      basis: '경계 판정 12건이 HITL 검토 대기 중 (임계 10건)',
      mainDefect: '경계 판정 · 최장 대기 23분',
      causeCandidate: 'AOI-07 판정 드리프트 +1.9%p — 캘리브레이션 기준 이탈 추정',
      recommendation: 'AOI-07 기준 캘리브레이션 확인 후 경계 건 일괄 검토',
      link: 'qc-aoi',
    },
  },
  {
    alertId: 'AL-260828-0831', level: 'amber', title: '비가동 사유 미등록', target: 'PR-05', targetName: 'A-프레스 5호기',
    metric: '34분 경과', agent: '⑨ 이상 알림', occurredAt: '2026-08-28 08:31', elapsed: '41분 전',
    state: '미확인', type: '설비 정지',
    detail: {
      lotNo: '—',
      basis: '08:12 정지 후 34분간 사유 미입력 (임계 30분)',
      mainDefect: '—',
      causeCandidate: '금형수리 & 금형교체 (Agent 제안 · 신뢰도 0.82)',
      recommendation: '비가동 관리 화면에서 사유 등록 — 가동률 산출에 영향',
      link: 'prod-down',
    },
  },
  {
    alertId: 'AL-260828-0810', level: 'gray', title: '보고서 초안 생성 완료', target: '일일 생산현황', targetName: '—',
    metric: '—', agent: '⑥ 보고서 생성', occurredAt: '2026-08-28 07:10', elapsed: '1시간 전',
    state: '확인됨', type: '기타',
    detail: {
      lotNo: '—',
      basis: '2026-08-27 08:00 ~ 08-28 08:00 집계 완료',
      mainDefect: '—',
      causeCandidate: '—',
      recommendation: '일일 생산현황 보고 화면에서 검토 후 확정',
      link: 'prod-daily',
    },
  },
  {
    alertId: 'AL-260828-0722', level: 'gray', title: '금형 교체 후 초기 구간 진입', target: 'PR-03', targetName: 'A-프레스 3호기',
    metric: 'M-2207 교체', agent: '⑨ 이상 알림', occurredAt: '2026-08-28 07:22', elapsed: '1시간 전',
    state: '확인됨', type: '기타',
    detail: {
      lotNo: '—',
      basis: '금형 M-2207 교체 감지 · 초기 60분 구간 진입',
      mainDefect: '—',
      causeCandidate: '과거 교체 직후 60분 구간에서 chip 급증 3회',
      recommendation: '초기 구간 표본 검사 주기 단축',
      link: 'qc-aoi',
    },
  },
];

/** 승격(에스컬레이션) 대상 — 미확인 상태가 지속된 건 */
export const ESCALATION_TARGETS = [
  { alertId: 'AL-260828-0912', title: '불량률 임계 초과', target: 'PR-03', elapsedMin: 8, nextLevel: '1차', nextAt: '30분 경과 시', to: '제조팀 파트장' },
  { alertId: 'AL-260828-0831', title: '비가동 사유 미등록', target: 'PR-05', elapsedMin: 41, nextLevel: '2차', nextAt: '2시간 경과 시', to: '해당 팀장' },
];

/** 알림 발송 로그 */
export const ALERT_SEND_LOG = [
  { ts: '2026-08-28 09:04', alertId: 'AL-260828-0912', channel: '메일 · 시스템 팝업', group: '품질보증팀 · 제조팀 파트장', recipientCnt: 5, result: '성공' },
  { ts: '2026-08-28 08:49', alertId: 'AL-260828-0849', channel: '시스템 팝업', group: '품질보증팀', recipientCnt: 3, result: '성공' },
  { ts: '2026-08-28 08:31', alertId: 'AL-260828-0831', channel: '시스템 팝업', group: '현장 반장', recipientCnt: 1, result: '성공' },
  { ts: '2026-08-28 07:10', alertId: 'AL-260828-0810', channel: '메일', group: '생산관리팀', recipientCnt: 2, result: '성공' },
  { ts: '2026-08-27 22:14', alertId: 'AL-260827-2214', channel: '메일 · SMS', group: '생산관리팀 · 제조팀', recipientCnt: 4, result: '일부 실패 (SMS 1건)' },
];
