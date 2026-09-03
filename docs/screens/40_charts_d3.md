# 40. 대시보드 차트 d3.js 전환 명세

| 항목 | 값 |
| :--- | :--- |
| 대상 화면 | **`/dashboard/ai` · `/dashboard/process` · `/dashboard/kpi` 3화면만** |
| 플랫폼 | **웹 전용** (`expo start --web` · `expo export --platform web`) |
| 신규 폴더 | `src/shared/components/charts-d3/` |
| 기존 폴더 | `src/shared/components/charts/` — **삭제하지 않고 유지** |
| 기능 ID | CM-06 (차트 공통) |

> 대시보드 3화면의 차트를 **d3.js 로 직접 그리도록** 바꿉니다.
> 기존 `charts/` 8종은 그대로 두고, 이를 쓰는 나머지 6화면(AOI 판정 분석·예측, AI 모델 버전 관리, 자연어 질의, 실적 집계·조회)은 **손대지 않습니다.**

---

## 1. 왜 바꾸는가 — 현재 구현의 한계

현재 `charts/` 는 `react-native-svg` 로 직접 좌표를 계산합니다. 그래서 다음이 안 됩니다.

| 한계 | 현재 상태 | d3 전환 후 |
| :--- | :--- | :--- |
| **가로 왜곡** | `LineChart`·`BarChart` 가 `viewBox="0 0 620 H"` + `preserveAspectRatio="none"` — 카드 폭이 620px 이 아니면 **글자와 원이 가로로 늘어나거나 찌그러집니다** | 컨테이너 실제 폭을 측정해 1:1 픽셀로 그림 |
| **축 눈금** | `[0, .25, .5, .75, 1]` 5등분 고정 — 0.7, 1.4, 2.1 같은 어정쩡한 눈금이 나옴 | `scale.ticks()` 가 사람이 읽기 좋은 값(0, 1, 2, 3)으로 자동 선정 |
| **툴팁** | 없음. 값을 보려면 표를 따로 봐야 함 | hover 시 해당 지점 값·계열명 표시 |
| **전환 효과** | 없음. 조회 조건을 바꾸면 차트가 툭 바뀜 | `transition().duration()` 으로 값 변화가 눈에 보임 |
| **곡선 보간** | 직선만 (`Polyline`) | `curveMonotoneX` 등 선택 가능 |
| **레이아웃 계산** | 도넛 각도·레이더 좌표를 손으로 삼각함수 계산 | `d3.pie()` · `d3.arc()` · `d3.lineRadial()` |

---

## 2. 의존성

```bash
npm i d3
```

필요한 서브모듈만 넣어도 됩니다 (번들 크기 우선 시 권장).

```bash
npm i d3-selection d3-scale d3-shape d3-array d3-axis d3-transition d3-format
```

> `d3-transition` 은 `d3-selection` 의 프로토타입을 확장하므로 **import 만 해도 `.transition()` 이 활성화**됩니다.
> `d3-scale-chromatic` 등 **색 팔레트 모듈은 쓰지 마세요.** 계열색은 아래 4-2 규칙대로 테마에서 받습니다.

---

## 3. 구조

```text
src/shared/components/
├── charts/                     ← 기존 8종 (건드리지 않음)
│   └── chartData.js            ← num · isNum · withValues · ChartEmpty  ★ 재사용
└── charts-d3/                  ← 신규 (웹 전용)
    ├── index.js                ← charts/index.js 와 동일한 export 이름
    ├── useD3.js                ← d3 렌더 훅 (ref · 크기 측정 · 테마 재렌더)
    ├── useChartSize.js         ← ResizeObserver 로 컨테이너 폭 측정
    ├── d3Theme.js              ← theme → d3 에 넘길 색·폰트 토큰 변환
    ├── Tooltip.jsx             ← 공용 hover 툴팁
    ├── LineChart.jsx
    ├── BarChart.jsx
    ├── HBarChart.jsx
    ├── DonutChart.jsx
    ├── RadarChart.jsx
    ├── HeatMap.jsx
    ├── Gauge.jsx
    └── DotPlot.jsx
```

### 3-1. 화면 쪽 변경은 **import 한 줄**

props 계약을 그대로 유지하므로 View 코드 본문은 고치지 않습니다.

```diff
  // src/domains/dashboard/view/AiDashboardView.jsx
- import { BarChart, DonutChart, HeatMap, LineChart, RadarChart } from '@shared/components/charts';
- import DotPlot from '@shared/components/charts/DotPlot';
+ import { BarChart, DonutChart, HeatMap, LineChart, RadarChart } from '@shared/components/charts-d3';
+ import DotPlot from '@shared/components/charts-d3/DotPlot';
```

바꿀 파일은 3개뿐입니다.

| 파일 | 교체할 import |
| :--- | :--- |
| `dashboard/view/AiDashboardView.jsx` | `BarChart, DonutChart, HeatMap, LineChart, RadarChart` + `DotPlot` |
| `dashboard/view/ProcessDashboardView.jsx` | `BarChart, DonutChart, HBarChart, HeatMap, LineChart` + `DotPlot` |
| `dashboard/view/KpiDashboardView.jsx` | `BarChart, DonutChart, Gauge, HBarChart, HeatMap, LineChart, RadarChart` |

---

## 4. 공통 규칙

### 4-1. props 계약 — **기존과 100% 동일**

한 글자도 바꾸지 마세요. 바꾸면 View 코드를 함께 고쳐야 하고, 나중에 기존 차트로 되돌릴 수 없습니다.

| 컴포넌트 | props |
| :--- | :--- |
| `LineChart` | `labels[]` · `series[{name, data[], dashed}]` · `height=170` · `min` · `max` · `target` · `unit=''` · `showLegend=true` |
| `BarChart` | `data[{l, v, v2}]` · `height=170` · `stacked=false` |
| `HBarChart` | `data[{l, v, cls}]` · `unit=''` · `target` · `format=comma` · `labelWidth=96` · `valueWidth=66` |
| `DonutChart` | `segs[{l, v}]` · `height=180` · `unitLabel='건'` |
| `RadarChart` | `axes[{l, v, t}]` · `height=210` |
| `HeatMap` | `rows[]` · `cols[]` · `data[][]` · `unit=''` · `lo=0` · `hi=100` · `invert=false` · `cellWidth=34` |
| `Gauge` | `value=0` · `min=0` · `max=100` · `unit=''` · `label` · `target` · `level=''` |
| `DotPlot` | `data[{l, v, cls}]` · `min=0` · `max=100` · `target` · `unit=''` · `digits=1` · `labelWidth=80` |

### 4-2. 색 — 테마에서만 받습니다

d3 기본 팔레트(`schemeCategory10`, `interpolateBlues` 등)를 **쓰지 마세요.** 라이트/다크 테마가 깨집니다.

```js
const theme = useTheme();

theme.seriesAt(i)          // 계열색 c1~c6 — 고정 순서 배정, 순환 금지
                           // 7번째 이상 계열은 호출하는 쪽에서 '기타'로 묶어 넘깁니다
theme.color.border         // 눈금선
theme.color.mutedForeground// 축 라벨
theme.color.foreground     // 값 텍스트
theme.color.card           // 점(circle) 안쪽 채움
theme.color.destructive    // 목표선 · bad
theme.color.warning        // warn
theme.color.success        // ok
theme.color.muted          // 빈 트랙
theme.alpha('info', 0.1~0.9) // 히트맵 명도 단계
```

`cls` 색 규칙 (`HBarChart` · `DotPlot`)
`'bad'` → `destructive` / `'warn'` → `warning` / 그 외 → `seriesAt(0)`

### 4-3. null 처리 — 기존 헬퍼를 **반드시** 재사용

실 데이터에는 아직 적재되지 않은 지표가 `null` 로 옵니다(설비 가동률 등). d3 는 `null` 을 스케일에 넣으면 `NaN` 좌표를 만들어 **path 가 통째로 사라집니다.**

```js
import { num, isNum, withValues, ChartEmpty } from '@shared/components/charts/chartData';
```

| 헬퍼 | 용도 |
| :--- | :--- |
| `num(v)` | 숫자면 숫자, 아니면 `null` (`''` · `NaN` · `Infinity` 포함) |
| `withValues(list, 'v')` | 값 없는 항목 제거 + 숫자 변환 |
| `ChartEmpty` | 값이 하나도 없을 때 「데이터 없음」 자리 표시 |

- `LineChart` — `null` 구간은 **선을 끊습니다.** `d3.line().defined(d => d.v !== null)` 사용
- `BarChart` — `null` 은 0 으로 두되, **전부 비어 있으면** `ChartEmpty`
- `HeatMap` — `null` 셀은 `transparent` + 텍스트 `—`

### 4-4. 반응형 — ResizeObserver 로 실제 폭 측정

```js
// useChartSize.js
export function useChartSize(height) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width, height };
}
```

- `viewBox` + `preserveAspectRatio="none"` **금지** (현재 왜곡의 원인)
- `width` 가 0 이면 아직 측정 전 → 그리지 않고 자리만 잡습니다
- 폭이 좁아지면 x축 라벨을 솎아 냅니다 (겹침 방지) — 라벨 하나당 최소 44px 확보

### 4-5. 테마 전환 재렌더

`useTheme()` 은 light ↔ dark 전환 시 새 객체를 돌려줍니다. d3 렌더 `useEffect` 의 **의존성 배열에 `theme` 을 반드시 넣으세요.** 빠뜨리면 다크 모드에서 이전 색이 남습니다.

```js
useEffect(() => { draw(); }, [data, width, height, theme]);
```

### 4-6. 렌더 방식 — React 가 `<svg>` 를, d3 가 내부를

React 와 d3 가 같은 노드를 두고 다투지 않게 **역할을 나눕니다.**

```jsx
export default function LineChart({ labels = [], series = [], height = 170, ... }) {
  const theme = useTheme();
  const { ref, width } = useChartSize(height);

  useEffect(() => {
    if (!width) return;
    const svg = d3.select(ref.current).select('svg');
    svg.selectAll('*').remove();       // 매 렌더 초기화 — enter/update/exit 를 쓸 거면 생략
    // …여기서만 d3 로 그립니다
  }, [labels, series, width, height, theme]);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={width} height={height} role="img" aria-label="시간대별 불량률 추이" />
    </div>
  );
}
```

> **웹 전용이므로 `<div>` · `<svg>` 같은 DOM 태그를 직접 씁니다.** react-native-web 은 react-dom 위에서 돌아가므로 웹 번들에서는 정상 동작합니다.

### 4-7. 앱 빌드 안전장치

`app.json` 에 `ios` · `android` 설정이 남아 있으므로, 네이티브 번들에서 DOM 태그를 만나면 크래시합니다. 둘 중 하나로 막아 주세요.

- **(권장)** `charts-d3/index.js` 최상단에서 `Platform.OS !== 'web'` 이면 기존 `charts/` 를 그대로 re-export
- 또는 파일명을 `LineChart.web.jsx` 로 두고 `LineChart.jsx` 에 기존 구현을 두어 Metro 가 플랫폼별로 고르게 함

### 4-8. 인터랙션

| 항목 | 규칙 |
| :--- | :--- |
| **툴팁** | hover 시 해당 x 위치의 전 계열 값 표시. `pointer-events` 는 투명 overlay `rect` 로 받습니다 |
| 툴팁 내용 | `{라벨} / {계열명} {값}{단위}` — **마스킹된 값(`비공개`)은 툴팁에도 노출 금지** |
| **전환** | `transition().duration(400)` — 데이터 변경 시 y 좌표만. 최초 마운트는 전환 없이 |
| 커서 | 차트 영역 `cursor: default` (클릭 동작이 없는 차트는 pointer 금지) |
| 접근성 | `<svg role="img" aria-label="{카드 제목}">` |

### 4-9. 마스킹

차트 자체는 `BlindValue` 를 쓰지 않습니다. **권한이 없으면 View 가 값을 넘기지 않거나 카드를 감춥니다.** d3 컴포넌트 안에서 `canData()` 를 직접 호출하지 마세요 (기존 차트와 동일한 규칙).

---

## 5. 차트별 d3 매핑

### 5-1. LineChart — 시간대별 추이

| 현재 | d3 |
| :--- | :--- |
| 손계산 `X(i)` · `Y(v)` | `scalePoint()` / `scaleLinear()` |
| `[0,.25,.5,.75,1]` 고정 눈금 | `y.ticks(5)` |
| `<Polyline points>` | `d3.line().x().y().defined()` |
| 첫 계열 면적 `<Polygon>` | `d3.area().y0(innerH).y1()` — **첫 계열만, `fillOpacity 0.1`** |
| 목표선 `<Line strokeDasharray="5 4">` | 동일 유지 + 우측 상단 `목표 {n}{unit}` 라벨 |
| 각 점 `<Circle r=3>` | `selectAll('circle').data().join()` |
| 범례 | **차트 밖 React 로 유지** (기존과 동일, `showLegend` · 계열 2개 이상일 때만) |

- `dashed: true` 인 계열은 `stroke-dasharray: 5 4`
- y 범위 : `min`/`max` 가 오면 그대로, 없으면 `d3.extent()` + `target` 포함
- **`defined()` 로 null 구간 선 끊기** — 이게 이번 전환의 핵심 요구사항입니다

### 5-2. BarChart — 세로 막대

| 현재 | d3 |
| :--- | :--- |
| `step = iw / bars.length` | `scaleBand().padding(0.3)` |
| `bw = min(30, step*0.5)` | `band.bandwidth()` 에 상한 30px |
| `v2` 나란히 | 내부 `scaleBand` (grouped) |
| `v2` 누적 (`stacked`) | `d3.stack()` 또는 y 오프셋 직접 계산 |
| y 상한 `max * 1.12` | `d3.max()` 후 `.nice()` |

- 라운드 코너 `rx=3` 유지
- x 라벨은 `bandwidth` 가 24px 미만이면 회전(-45°) 또는 솎아 내기

### 5-3. HBarChart — 가로 막대

**현재 SVG 가 아니라 `View` + `width %` 로 그려져 있습니다.** d3 판은 `scaleLinear` + `<rect>` SVG 로 통일합니다.

- 행 높이 16px · 라운드 4px · 항목 간 9px 유지
- `labelWidth` / `valueWidth` props 는 좌우 여백으로 반영
- `target` 이 오면 세로 기준선 + 하단 우측 `▏목표 {format(target)}{unit}`
- 값 라벨은 `format(v)` 로 (기본 `comma`)

### 5-4. DonutChart — 비중

| 현재 | d3 |
| :--- | :--- |
| `strokeDasharray` 로 호 흉내 | **`d3.pie().sort(null)` + `d3.arc()`** ← 정공법 |
| `r=58` · `strokeWidth=20` | `innerRadius(48)` · `outerRadius(68)` |
| 세그먼트 사이 2px 간격 | `padAngle(0.012)` |
| 중앙 합계 텍스트 | 그대로 (합계 19px bold + 단위 9.5px) |
| 우측 범례 | **React 로 유지** — 라벨 · 값 · 비율(%) 3열 |

- `.sort(null)` 필수 — 넘어온 순서를 지켜야 계열색이 범례와 맞습니다
- 값 0 뿐이면 `ChartEmpty`

### 5-5. RadarChart — 6축 품질 지수

| 현재 | d3 |
| :--- | :--- |
| `pt(i, r)` 삼각함수 직접 | `d3.lineRadial().angle().radius().curve(curveLinearClosed)` |
| 거미줄 4겹 `<Polygon>` | `[1, .75, .5, .25]` 반복 |
| 목표 점선 | `destructive` · `dasharray 5 4` · `opacity .8` |
| 현재 실선 + 면 | `seriesAt(0)` · `fillOpacity .18` · `strokeWidth 2` |
| 축 이름 | `R + 18` 위치, 9.5px |
| 하단 범례(현재/목표) | React 로 유지 |

- 값 범위는 0~100 고정 (props 로 안 받음)

### 5-6. HeatMap — 설비 × 시간

**현재 `View` 격자 + 가로 `ScrollView`.** 이 구조를 유지하되 **색 계산만** d3 로 바꿉니다.

```js
const t = scaleLinear().domain(invert ? [hi, lo] : [lo, hi]).range([0.1, 0.9]).clamp(true);
const fill = (v) => (isNum(v) ? theme.alpha('info', t(num(v))) : 'transparent');
```

- 셀 폭 `cellWidth`(기본 34) · 행 라벨 74px · 값 없으면 `—`
- 하단 색 범례 6단계 유지
- 셀이 수백 개가 될 수 있으므로 **transition 은 넣지 마세요** (렌더 비용)

### 5-7. Gauge — 반원 게이지

| 현재 | d3 |
| :--- | :--- |
| `M ... A ...` path 문자열 직접 | `d3.arc().startAngle(-π/2).endAngle(π/2)` |
| `strokeDasharray` 진행률 | 값 비율만큼 `endAngle` 계산 |
| `level` 색 분기 | 동일 (`bad`/`warn`/`ok`/기본) |
| 목표 눈금 `<Line>` | 동일 |
| 중앙 값 + 단위 `<TSpan>` | 26px bold + 12px 단위 |

- `value` 가 `null` 이면 `ChartEmpty(118)` — **KPI 미측정 지표가 실제로 여기 걸립니다**
- 값 변화 시 `arcTween` 으로 바늘이 움직이면 좋습니다 (선택)

### 5-8. DotPlot — 목표 대비 편차

**현재 `View` + `left %`.** d3 판은 `scaleLinear` + SVG 로.

- `min`~`max` 좁은 구간(예: 94~100) 위치 인코딩 — **0에서 시작하지 않는 것이 의도**입니다
- 점 12px · 테두리 2px `card` 색 · `cls` 색 규칙 적용
- `target` 세로선 + 우측 편차 `{+/-}n.n%p` (음수 `destructive` / 양수 `success`)
- 하단 축 라벨 3개(min · 중간 · max)

---

## 6. 화면별 적용 대상

### `/dashboard/ai` — 7개

| 카드 | 차트 |
| :--- | :--- |
| 시간대별 불량률 추이 | `LineChart` × 2 (불량률 + 유형별 수량 보조) |
| 라인별 생산량·불량률 | `BarChart` + `LineChart` |
| 공정 품질 지수 | `RadarChart` (6축) |
| 불량 유형 구성 | `DonutChart` |
| 공정별 수율 | `DotPlot` |
| 생산 계획 대비 실적 | `BarChart` (계획 `v` / 실적 `v2`) |
| 설비별 시간대 가동률 | `HeatMap` (invert) |

### `/dashboard/process` — 7개

`LineChart` × 2 · `BarChart` · `DonutChart` · `DotPlot` · `HBarChart` × 2 · `HeatMap`

### `/dashboard/kpi` — 8개

`Gauge` × 3 (KPI 카드) · `LineChart` × 2 · `DonutChart` × 2 · `BarChart(stacked)` · `RadarChart` · `HBarChart` · `HeatMap(cellWidth 72)`

---

## 7. 검증

```bash
npm run check          # 구문 · 서비스 참조 · 목 커버리지 · 라우트 일치
npm run test           # 전체 (현재 90 통과 / 0 실패 — 회귀 없어야 함)
SPEC=06 npm run test   # 화면 렌더
SPEC=07 npm run test   # 화면 값
```

수동 확인 항목

- [ ] 라이트 / 다크 **양쪽** 색이 맞는가
- [ ] 창 폭을 1280 → 900 → 1600 으로 바꿔도 **글자가 늘어나지 않는가** (현재의 왜곡이 사라졌는가)
- [ ] `null` 지표가 있는 카드에서 선이 끊기고 「데이터 없음」이 뜨는가
- [ ] 조회 조건을 바꿀 때 전환 효과가 자연스러운가
- [ ] 툴팁에 마스킹 대상 값이 새지 않는가
- [ ] 나머지 6화면(AOI · 모델 버전 · 자연어 질의 · 실적 집계)이 **그대로인가**

---

## 8. 개발 체크리스트

**준비**
- [ ] `d3` (또는 서브모듈) 의존성 추가
- [ ] `charts-d3/` 폴더 + `index.js` (export 이름은 `charts/index.js` 와 동일)
- [ ] `useChartSize.js` — ResizeObserver 폭 측정
- [ ] `d3Theme.js` — theme → d3 색·폰트 토큰
- [ ] `Tooltip.jsx` — 공용 hover 툴팁
- [ ] `Platform.OS !== 'web'` 폴백 (앱 빌드 크래시 방지)

**차트 8종**
- [ ] `LineChart` — scale · line/area · **`defined()` null 끊기** · 목표선 · 툴팁 · 범례
- [ ] `BarChart` — scaleBand · grouped / stacked · `.nice()` 눈금
- [ ] `HBarChart` — SVG 전환 · target 기준선 · `format` 적용
- [ ] `DonutChart` — `pie().sort(null)` + `arc()` · padAngle · 중앙 합계 · React 범례
- [ ] `RadarChart` — `lineRadial()` · 거미줄 4겹 · 목표 점선 · 축 이름
- [ ] `HeatMap` — 색 스케일만 d3 · invert · 범례 6단계 · **transition 금지**
- [ ] `Gauge` — `arc()` 반원 · level 색 · 목표 눈금 · null 처리
- [ ] `DotPlot` — SVG 전환 · 위치 인코딩 · target 편차 표시

**연결**
- [ ] `AiDashboardView.jsx` import 교체
- [ ] `ProcessDashboardView.jsx` import 교체
- [ ] `KpiDashboardView.jsx` import 교체
- [ ] 나머지 6화면 **변경 없음** 확인

**검증**
- [ ] `npm run check` · `npm run test` 회귀 없음
- [ ] 라이트/다크 · 반응형 · null · 툴팁 마스킹 수동 확인
