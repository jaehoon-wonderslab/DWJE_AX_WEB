# 덕우전자 AX — 이 디자인 시스템으로 화면을 만드는 규칙

## 1. 셋업 · 래핑
- 모든 컴포넌트는 `window.DwjeAX.*` 에 있고 **Provider 가 없습니다.** 테마는 `useTheme()` 이 내부 스토어(라이트 고정)에서 읽으므로 그대로 렌더하면 스타일이 적용됩니다.
- 컴포넌트는 React Native for Web 으로 만들어져 `<div>`/`<span>` 으로 렌더됩니다. 화면의 뼈대(페이지 배경·그리드·간격)는 일반 HTML 과 아래 CSS 변수로 짜고, 그 안에 컴포넌트를 놓습니다. `react-native` 를 직접 import 하지 마세요.
- 페이지 루트는 `background: var(--dwje-color-background)` (웜 그레이 #f4f5f7) 위에 흰 패널(`--dwje-color-card`, `border-radius: var(--dwje-radius-panel)`, `box-shadow: var(--dwje-panel-shadow)`)이 16px(`--dwje-gutter`) 여백으로 떠 있는 구조입니다. 사이드바 228px(`--dwje-sidebar-width`) · 상단바 64px(`--dwje-topbar-height`).
- 글꼴은 `styles.css` 가 동봉합니다. 직접 짜는 글자는 `font-family: var(--dwje-font-sans)`(Pretendard), 숫자는 `var(--dwje-font-num)`(Inter). **굵기는 500(라벨·본문) 과 600(제목·수치) 두 가지만** — 400·700 은 쓰지 않습니다. 글자는 작고 촘촘합니다(캡션 10.5~11px · 본문 12~12.5px · 제목 14~21px).

## 2. 스타일 어휘 — 컴포넌트는 props, 글루는 CSS 변수
- 컴포넌트에는 CSS 클래스를 붙이지 않습니다. 모양은 **props 로만** 바꿉니다: `Button variant="primary|outline|ghost|danger" size="md|sm"`, `Badge tone="green|blue|amber|red"`, `StatCard tone="up|down"`, `Card title sub right tight`. 자유 스타일이 필요하면 `style` prop(React Native 스타일 객체: `{ marginTop: 12 }`)을 넘깁니다.
- 직접 짜는 레이아웃에는 `_ds_bundle.css` 에 정의된 `--dwje-*` 변수만 씁니다.

| 용도 | 변수 |
|---|---|
| 캔버스 / 패널 / 2차 표면 / 호버 | `--dwje-color-background` · `--dwje-color-card` · `--dwje-surface`(#FAFAFA) · `--dwje-surface-hover` |
| 글자 | `--dwje-color-foreground`(본문 #1C1C1C) · `--dwje-color-secondary-foreground`(카드 안 문단) · `--dwje-color-muted-foreground`(캡션·라벨 #787878) |
| 잉크(제목·주요 동작·링크) | `--dwje-color-primary`(#0B1440) · `--dwje-color-info`(#1E2A78) · `--dwje-color-ink500` |
| 상태 | `--dwje-color-success`(#2E9E57) · `--dwje-color-destructive`(#E5482D) · `--dwje-color-warning`(앰버 #F2C14E) · `--dwje-color-warning-text`(배지 글자용 어두운 앰버) |
| 선 | `--dwje-hairline` · `--dwje-hairline-strong` · `--dwje-divider`(#DFE1E7) |
| 반지름 | `--dwje-radius-panel`(24) · `--dwje-radius`(16, 카드) · `--dwje-radius-action`(14, 주요 버튼) · `--dwje-radius-sm`(12, 입력·행) · `--dwje-radius-pill` |
| 차트 계열 | `--dwje-series-1` … `--dwje-series-6` (잉크 900 → 700 → 500 → 앰버 → 회색 → 성공) |

- **앰버는 데이터 채움·활성 점·주의 마커에만.** 글자·버튼·표면에 앰버를 쓰지 않습니다. 화면에 채움 버튼(`variant="primary"`)은 주요 동작 하나만.
- 위계는 크기가 아니라 색과 굵기로 만듭니다. 카드 안에 카드를 넣지 말고 2차 표면은 `StatCard` 처럼 #FAFAFA 중첩 카드(보더 없음)로.

## 3. 진실은 여기
- 토큰·글꼴·전역 규칙: `styles.css` → `fonts/fonts.css`, `_ds_bundle.css`(끝부분 `:root { --dwje-* }` 블록과 body 글꼴·keyframes `ax-fade-up`/`ax-pulse`/`ax-spin`).
- 컴포넌트별 사용법·props: `components/<group>/<Name>/<Name>.prompt.md` 와 `<Name>.d.ts`.
- 디자인 원칙 원문: `guidelines/docs/duckwoo-ax-style-reference.md`.

## 4. 앱 전체 · 화면 단위 컴포넌트
- `DwjeApp` 은 실제 앱 셸(사이드바 · 상단바 · 본문 · AI 질의 레일)입니다. `initialPath` 로 첫 화면을 고르고(`/ai/chat` 기본 · `/dashboard/ai` · `/production/result` · `/menu/report` · `/system/account` …), 부모에 높이가 없으면 `100vh` 를 씁니다. **페이지에 하나만** 두세요.
- `Screen*`(예 `ScreenDashAi`, `ScreenProdResult`, `ScreenRptScrap`) 은 셸 없는 화면 본문입니다. `<div style={{ height: 800 }}>` 처럼 높이가 있는 부모 안에 넣으세요. `LoginScreen`·`SignupScreen`·`ForgotPasswordScreen` 은 인증 화면입니다.
- 데모 계정 20140901(통합관리자, 전체 권한)으로 자동 로그인되고 데이터는 전부 목(mock)입니다. 기존 화면을 바꾸는 디자인은 해당 `Screen*` 을 놓고 그 옆·안에 부품을 덧붙이는 식으로 시작하면 실제 레이아웃 치수가 그대로 유지됩니다.

## 5. 조합 예시 (검증된 미리보기에서)
```jsx
const { Card, StatCard, KeyValue, Badge, Button } = window.DwjeAX;
<div style={{ background: 'var(--dwje-color-background)', padding: 16, fontFamily: 'var(--dwje-font-sans)' }}>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
    <StatCard label="금일 생산량" value="128,400" unit="EA" sub="계획 대비 96.2%" tone="up" />
    <StatCard label="종합 수율" value="97.4" unit="%" sub="목표 97.0% 달성" tone="up" />
    <StatCard label="PRESS 불량률" value="1.8" unit="%" sub="전일 대비 +0.4%p" tone="down" />
    <StatCard label="현재 이슈" value="3" unit="건" right={<Badge tone="red">긴급 1</Badge>} />
  </div>
  <Card title="공정별 수율" sub="오늘 · 목표 97.0%" right={<Button label="상세" size="sm" />}>
    <KeyValue rows={[['PRESS', '98.1%'], ['Plating', '96.9%'], ['Coating', '97.4%']]} />
  </Card>
</div>
```
