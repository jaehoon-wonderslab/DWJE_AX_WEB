/**
 * [Model] 불량 회차 번호를 사람이 읽을 수 있게 줄입니다.
 *
 * DIMENSION 한 시리얼의 SEQ 는 2,000~3,800개이고 그중 불량이 수천 개일 수 있습니다.
 * 전부 나열하면 칸이 번호로 뒤덮이므로 앞쪽만 적고 나머지는 수로 말합니다.
 * 이어지는 번호는 범위로 묶습니다 — 「12, 13, 14」 보다 「12~14」 가 읽기 쉽습니다.
 *
 * [주의] 서버가 주는 `failSeqs` 는 이미 앞쪽 N개로 잘려 옵니다(`failSeqsTop` · `failSeqsTruncated`).
 * 그래서 「외 몇 회차」 는 **목록 길이가 아니라 `failSeqCnt`(전체 불량 회차 수)** 와 견줘 셉니다.
 * 잘린 목록만 보고 세면 3,232회차가 20회차로 둔갑합니다.
 *
 * @param {number[]} seqs 서버가 준 불량 회차 번호 (오름차순, 잘려 있을 수 있음)
 * @param {number}   total 전체 불량 회차 수 (`failSeqCnt`)
 * @param {number}   [head] 적어 보일 범위 묶음 수
 */
import { comma } from '@shared/utils/formatUtil';

export function failSeqText(seqs, total, head = 6) {
  if (!seqs?.length) return '';

  const ranges = [];
  seqs.forEach((n) => {
    const last = ranges[ranges.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  });

  const shown = ranges.slice(0, head);
  const shownCnt = shown.reduce((sum, [a, b]) => sum + (b - a + 1), 0);
  const rest = Number(total) > shownCnt ? ` 외 ${comma(Number(total) - shownCnt)}회차` : '';
  return `${shown.map(([a, b]) => (a === b ? `${a}` : `${a}~${b}`)).join(', ')}${rest}`;
}
