/**
 * AOI 치수 판정(DIMENSION) 목 데이터 — `EDGE.dbo.TB_SAMSUN_DIMENSION` 을 흉내 냅니다
 *
 * 실 서버(`/quality/aoi/dimension/serials`)가 읽는 원천의 모양을 그대로 따릅니다.
 * 예전 MES 라벨 이력 목(VNA-*)과는 설비 집합이 다릅니다 — 이쪽은 GP-*·MQ-* 입니다.
 * 그래서 기존 목을 돌려쓰지 않고 따로 만듭니다. 섞으면 데모 화면이 실제와 다른 이야기를 합니다.
 *
 * 한 행 = 제품 1개의 측정 1회(SEQ)이고, 치수(FAI)는 그 행 안에 가로로 펼쳐져 있습니다.
 * 한 시리얼이 SEQ 를 2,000~3,800개 갖고 1~2시간에 걸쳐 측정됩니다.
 *
 * 값은 **날짜와 키로 결정**됩니다 — 같은 날짜를 다시 조회하면 같은 목록이 나옵니다.
 * 데모에서 새로 고칠 때마다 숫자가 춤추면 화면을 믿을 수 없습니다.
 */

/** 작업장(직전 공정)과 그 설비 — 실측 그대로 S110 은 45개, S120 은 58개 치수를 씁니다 */
const LINES = [
  { wcCd: 'S110', eqptCd: 'GP-011', faiUsed: 45 },
  { wcCd: 'S110', eqptCd: 'GP-012', faiUsed: 45 },
  { wcCd: 'S110', eqptCd: 'GP-013', faiUsed: 45 },
  { wcCd: 'S110', eqptCd: 'GP-014', faiUsed: 45 },
  { wcCd: 'S110', eqptCd: 'GP-015', faiUsed: 45 },
  { wcCd: 'S120', eqptCd: 'MQ-002', faiUsed: 58 },
  { wcCd: 'S120', eqptCd: 'MQ-003', faiUsed: 58 },
  { wcCd: 'S120', eqptCd: 'MQ-008', faiUsed: 58 },
  { wcCd: 'S120', eqptCd: 'MQ018', faiUsed: 58 },
];

/** COMMENT 자리 — 실측에서 호기로 보이는 값입니다(뜻은 아직 확인되지 않았습니다) */
const CAVITIES = ['#1 B', '#2 B', '#3 B', '#5 B', '#6 B', '#7 B', '#8 B', '#9 B', '#8 Y'];

/**
 * 치수 기준값 58개 — 실측 한 회차의 FAI1~FAI58 을 그대로 옮긴 것입니다.
 * 자릿수와 분포가 실제와 같아야 표가 진짜처럼 보입니다(0.0x 대와 24.x 대가 섞여 있습니다).
 */
const FAI_BASE = [
  0.031, 0.0071, 0.0161, 0.0172, 0.0252, 0.014, 0.0113, 0.0092, 24.7115, 24.6739,
  24.9051, 24.8953, 20.0866, 20.1099, 20.1145, 20.0824, 20.0561, 0.1625, 1.8378, 0.1094,
  1.4526, 1.4769, 1.4639, 1.4502, 1.4929, 1.4811, 1.4588, 1.469, 1.4981, 0.3385,
  0.3381, 0.3124, 0.3177, 0.3035, 0.3177, 1.4906, 1.4489, 1.4524, 3.9185, 16.9229,
  3.9243, 3.9104, 1.4598, 1.4567, 8.6086, 4.646, 4.612, 4.599, 4.018, 4.008,
  4.014, 4.594, 4.005, 4.033, 4.18, 4.162, 3.645, 10.293,
];

/** 문자열 하나로 고정되는 난수 — 같은 키는 늘 같은 값을 냅니다 */
function seeded(key) {
  let seed = 0;
  for (const ch of String(key)) seed = (seed * 31 + ch.charCodeAt(0)) % 1000003;
  return (i) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
}

const pad = (n, len = 2) => String(n).padStart(len, '0');

/** `2026-08-28` → `20260828` */
const compact = (date) => String(date).replace(/-/g, '');

/** 하루 앞 날짜 */
function prevDay(date) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 되맞춘 한계 — 확정된 항목만 옵니다.
 *
 * 실 서버는 합격 표본의 포화값에서 상·하한을 역산하고, **확정된 것만** 내려 줍니다.
 * 그래서 목에서도 전체가 아니라 몇 개만 만듭니다 — 화면이 「한계 없음」 을 다루는 길도 데모에서 보여야 합니다.
 */
function specOf(line, date) {
  const rnd = seeded(`${line.eqptCd}|${date}|spec`);
  const picks = [];
  for (let i = 0; i < line.faiUsed && picks.length < 6; i += 1) {
    if (rnd(i) > 0.88) picks.push(i);
  }
  if (!picks.length) picks.push(0, 9);
  return picks.map((i) => {
    const base = FAI_BASE[i % FAI_BASE.length];
    const band = base > 10 ? 0.09 : base > 1 ? 0.03 : 0.012;
    const both = rnd(i + 500) > 0.6;
    return {
      no: i + 1,
      lower: both ? Number((base - band).toFixed(4)) : null,
      upper: Number((base + band).toFixed(4)),
    };
  });
}

/**
 * 하루치 시리얼 목록.
 *
 * 실측처럼 시리얼 몇 개는 자정을 넘겨 이어집니다(`seqMin > 1`) — 화면의 「이어짐」 표시를 데모에서도 볼 수 있게.
 */
export function dimensionSerials(date) {
  const rnd = seeded(`serials|${date}`);
  const count = 18 + Math.floor(rnd(0) * 10); // 하루 18~27 시리얼
  const out = [];

  for (let i = 0; i < count; i += 1) {
    const line = LINES[Math.floor(rnd(i * 7 + 1) * LINES.length)];
    // LOT 은 대개 전날 번호입니다 — 측정일과 LOT 이 다른 것을 데모에서도 드러냅니다
    const lotNo = rnd(i * 7 + 2) > 0.35 ? compact(prevDay(date)) : compact(date);
    const serialNo = pad(20 + Math.floor(rnd(i * 7 + 3) * 380), 5);
    const seqCnt = 2400 + Math.floor(rnd(i * 7 + 4) * 1400);
    const failRate = 4 + rnd(i * 7 + 5) * 62;
    const failSeqCnt = Math.max(1, Math.round((seqCnt * failRate) / 100));

    const carried = rnd(i * 7 + 6) < 0.14;
    const seqMin = carried ? 1 + Math.floor(rnd(i * 7 + 8) * (seqCnt * 0.5)) : 1;
    const seqMax = seqCnt;
    const daySeqCnt = seqMax - seqMin + 1;

    const startMin = Math.floor(rnd(i * 7 + 9) * 1200); // 하루 중 시작 시각
    const spanMin = 60 + Math.floor(rnd(i * 7 + 10) * 65); // 1~2시간
    const at = (mins) => `${date} ${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}:${pad(Math.floor(rnd(mins) * 60))}`;

    out.push({
      serialKey: `${line.wcCd}~${line.eqptCd}~${lotNo}~${serialNo}`,
      wcCd: line.wcCd,
      eqptCd: line.eqptCd,
      lotNo,
      serialNo,
      seqCnt,
      failSeqCnt,
      failRate: Number(((failSeqCnt / seqCnt) * 100).toFixed(2)),
      // SEQ 중 하나라도 불량이면 시리얼은 불량입니다 — 실측에서도 전부 불량으로 나옵니다
      passed: false,
      daySeqCnt,
      seqMin,
      seqMax,
      partial: seqMin > 1,
      firstAt: at(startMin),
      lastAt: at(startMin + spanMin),
      cavity: CAVITIES[Math.floor(rnd(i * 7 + 11) * CAVITIES.length)],
      faiUsed: line.faiUsed,
    });
  }

  // 불량 회차 많은 순 — 실 서버 기본 정렬과 같습니다
  return out.sort((a, b) => b.failSeqCnt - a.failSeqCnt);
}

/** 시리얼 한 건의 불량 회차 번호 — 앞쪽 `top` 개만 줍니다(실 서버도 잘라 줍니다) */
export function dimensionFailSeqs(row, top = 20) {
  const rnd = seeded(`${row.serialKey}|fail`);
  const out = [];
  let seq = row.seqMin;
  // 불량률만큼의 간격으로 흩뿌립니다 — 앞쪽에 몰려 있어야 「1~7, 9~10」 같은 묶음이 나옵니다
  const step = Math.max(1, Math.round(row.seqCnt / row.failSeqCnt));
  for (let i = 0; out.length < top && seq <= row.seqMax; i += 1) {
    if (rnd(i) < 1 / step + 0.35) out.push(seq);
    seq += 1;
  }
  return out;
}

/**
 * 시리얼 한 건의 회차 상세 한 쪽.
 *
 * `only='ng'` 면 불량 회차만, `'all'` 이면 양품·불량을 섞어 SEQ 순으로 줍니다.
 * 데모에서 이 둘을 바꿔 봐야 「불량 회차만 보고 있다」는 것이 드러납니다.
 */
export function dimensionSeqPage(row, { only = 'ng', page = 1, size = 100 } = {}) {
  const line = LINES.find((l) => l.eqptCd === row.eqptCd) || LINES[0];
  const spec = specOf(line, row.lotNo);
  const specByNo = new Map(spec.map((s) => [s.no, s]));
  const onlyNg = only !== 'all';
  const total = onlyNg ? row.failSeqCnt : row.seqCnt;
  const offset = (Math.max(1, Number(page) || 1) - 1) * Math.max(1, Number(size) || 100);
  const take = Math.max(1, Number(size) || 100);

  const failSet = new Set(dimensionFailSeqs(row, 4000));
  const rnd = seeded(`${row.serialKey}|seq`);

  const items = [];
  let seq = row.seqMin + (onlyNg ? 0 : offset);
  let skipped = 0;

  while (items.length < take && seq <= row.seqMax) {
    const bad = failSet.has(seq);
    if (onlyNg && !bad) { seq += 1; continue; }
    if (onlyNg && skipped < offset) { skipped += 1; seq += 1; continue; }

    // 불량 회차는 한계가 확정된 항목 중 하나가 벗어납니다 — 화면이 그 값을 붉게 칠합니다
    const violFais = [];
    if (bad && spec.length) {
      const pick = spec[Math.floor(rnd(seq) * spec.length)];
      if (rnd(seq + 3) > 0.35) violFais.push(pick.no);
    }

    const measuredAt = (() => {
      const [d, t] = row.firstAt.split(' ');
      const base = new Date(`${d}T${t}`);
      base.setSeconds(base.getSeconds() + (seq - row.seqMin) * 1.2);
      return `${base.toISOString().slice(0, 10)} ${base.toTimeString().slice(0, 8)}`;
    })();

    items.push({
      seq,
      passed: !bad,
      measuredAt,
      cavity: row.cavity,
      measurements: Array.from({ length: line.faiUsed }, (_, k) => {
        const no = k + 1;
        const base = FAI_BASE[k % FAI_BASE.length];
        const jitter = (rnd(seq * 97 + k) - 0.5) * (base > 10 ? 0.05 : base > 1 ? 0.02 : 0.008);
        let value = base + jitter;
        // 지목된 항목은 실제로 한계를 넘겨 둡니다 — 표의 붉은 값과 근거가 어긋나면 안 됩니다
        if (violFais.includes(no)) {
          const sp = specByNo.get(no);
          if (sp?.upper != null) value = Number(sp.upper) + Math.abs(jitter) + 0.004;
          else if (sp?.lower != null) value = Number(sp.lower) - Math.abs(jitter) - 0.004;
        }
        return { no, value: Number(value.toFixed(4)) };
      }),
      violFais,
    });
    seq += 1;
  }

  return {
    items,
    spec,
    faiNos: Array.from({ length: line.faiUsed }, (_, k) => k + 1),
    limitBasis: `${row.eqptCd} ${row.lotNo} 합격 표본 포화값 — 데모용 재구성치`,
    resolution: line.faiUsed === 58 ? 0.001 : 0.0001,
    meta: { page: Math.max(1, Number(page) || 1), size: take, total, totalPages: Math.max(1, Math.ceil(total / take)) },
  };
}
