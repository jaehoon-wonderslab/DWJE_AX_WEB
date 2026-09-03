/**
 * 표시 형식 변환 공통 함수
 *
 * 화면마다 숫자·날짜 표기가 달라지지 않도록 여기 모아 씁니다.
 */

/** 1234567 → "1,234,567" */
export function comma(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  return Number.isNaN(num) ? String(n) : num.toLocaleString('ko-KR');
}

/**
 * 소수 자리를 고정해 표시합니다. 2.6 → "2.6"
 * @param {number} n 값
 * @param {number} [digits=1] 소수 자릿수
 */
export function fixed(n, digits = 1) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  return Number.isNaN(num) ? String(n) : num.toFixed(digits);
}

/**
 * 비율(%)을 서버가 준 정밀도 그대로 보여 줍니다.
 *
 * `fixed()` 는 소수 한 자리로 줄이는데, 불량률처럼 값이 작은 지표에서는
 * 1.04% 가 1.0% 로 보여 실제와 다른 인상을 줍니다.
 * 서버·DB 가 소수 둘째 자리로 계산하므로 화면도 같은 자리까지 씁니다.
 *
 * @param {number} n 비율 값
 * @returns {string} 예) "1.04" · 값이 없으면 "—"
 */
export function rate(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  // 정수로 떨어지면 소수점을 붙이지 않습니다 (100% → "100")
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
}

/** 목표 대비 편차를 부호와 함께 표시합니다. -0.4 → "-0.4%p" */
export function diff(n, digits = 1, unit = '%p') {
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num > 0 ? '+' : ''}${num.toFixed(digits)}${unit}`;
}

/** 백분율 표기. 0.962 → "96.2%" (분모를 주면 비율을 직접 계산) */
export function percent(value, total, digits = 1) {
  if (total === undefined) return `${fixed(value, digits)}%`;
  if (!total) return '—';
  return `${((value / total) * 100).toFixed(digits)}%`;
}

/** 분 단위를 "1시간 23분" 형태로 */
export function minutesText(min) {
  const m = Number(min) || 0;
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

/** "2026-08-28" → "2026-08-28 (금)" */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function dateWithWeekday(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${dateStr} (${WEEKDAYS[d.getDay()]})`;
}

/** "2026-08-28" 기준으로 n일 전/후 날짜 문자열 */
export function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 오늘 날짜 (YYYY-MM-DD) */
export function today() {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 현재 시각 (HH:MM:SS) */
export function nowClock() {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 현재 일시 (YYYY-MM-DD HH:MM) */
export function nowStamp() {
  return `${today()} ${nowClock().slice(0, 5)}`;
}

/**
 * 지표 값이 정상/주의/위험 중 어디에 해당하는지 판정합니다.
 * (지표 측정 데이터 관리 SY-13 의 기준 수치와 같은 규칙)
 *
 * @param {number} value 측정값
 * @param {object} std { ok, warn, bad, lowerIsBetter }
 * @returns {'ok'|'warn'|'bad'} 등급
 */
export function gradeOf(value, std) {
  if (!std) return 'ok';
  const v = Number(value);
  if (std.lowerIsBetter) {
    if (v >= std.bad) return 'bad';
    if (v >= std.warn) return 'warn';
    return 'ok';
  }
  if (v <= std.bad) return 'bad';
  if (v <= std.warn) return 'warn';
  return 'ok';
}

/** 문자열을 0~1 사이의 안정적인 난수로 바꿉니다 (더미 데이터 생성용) */
export function hashRatio(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i += 1) {
    h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/**
 * 낱말 뒤에 받침에 맞는 조사를 붙입니다.
 *
 * 안내 문구를 "사유을(를)" 처럼 쓰지 않기 위한 헬퍼입니다.
 *
 * 사용 예)
 *   withParticle('사유', '을')   → '사유를'
 *   withParticle('사번', '을')   → '사번을'
 *   withParticle('이름', '이')   → '이름이'
 *
 * @param {string} word 낱말
 * @param {'을'|'이'|'은'|'과'|'으로'} particle 받침이 있을 때 쓰는 조사
 * @returns {string} 낱말 + 조사
 */
export function withParticle(word, particle) {
  const pairs = { 을: '를', 이: '가', 은: '는', 과: '와', 으로: '로' };
  const text = String(word ?? '');
  const last = text.charCodeAt(text.length - 1);

  // 한글 음절이 아니면(영문·숫자 등) 받침이 있는 것으로 간주해 기본 조사를 씁니다
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul ? (last - 0xac00) % 28 !== 0 : true;

  // 'ㄹ' 받침은 '으로' 가 아니라 '로' 를 씁니다
  if (particle === '으로' && isHangul && (last - 0xac00) % 28 === 8) return `${text}로`;

  return text + (hasFinal ? particle : pairs[particle] || particle);
}
