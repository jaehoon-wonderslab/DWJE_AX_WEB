/** 조회 기간은 자료 범위이며 차트의 시간/일 집계 간격과 별개입니다. */
export const RANGE_OPTIONS = [
  { value: '일별', label: '최근 7일' },
  { value: '주별', label: '최근 4주' },
  { value: '월별', label: '최근 3개월' },
  { value: '기간선택', label: '직접 선택' },
];
export function rangeError(from, to) {
  const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to)) return '시작일과 종료일을 올바른 날짜로 입력해 주세요.';
  if (from > to) return '시작일은 종료일보다 늦을 수 없습니다.';
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 92) return '조회 기간은 시작일과 종료일 사이 최대 92일까지 가능합니다.';
  return '';
}
export function bucketLabel(bucket) {
  if (bucket?.unit === 'HOUR') return `${bucket.intervalHour || 2}시간`;
  if (bucket?.unit === 'DAY') return '일';
  if (bucket?.unit === 'WEEK') return '주';
  if (bucket?.unit === 'MONTH') return '월';
  return '구간';
}

/** 하루 조회의 00:00과 여러 날 조회의 09-04 00시를 같은 매트릭스 열로 맞춥니다. */
export function hourlySlot(raw, period) {
  const match = String(raw || '').match(/^(?:(\d{2}-\d{2}|\d{4}-\d{2}-\d{2})\s+)?(\d{2})(?:시|:00)$/);
  if (!match || Number(match[2]) > 23) return null;
  return { date: match[1] || period?.from || '', label: `${match[2]}시` };
}
