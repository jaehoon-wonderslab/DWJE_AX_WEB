---
category: cards-layout
---
# PageContainer · FullPageContainer

라우트 파일이 화면 본문을 감싸는 컨테이너. 본문 패널(흰 패널 안쪽) 을 채우고, 화면 성격에 따라 둘 중 하나를 고릅니다.

- **PageContainer** — 일반 화면. 세로 스크롤(ScrollView) + 24px 여백(위 22px) + 최대 폭 1400 · 왼쪽 정렬. 안에는 `PageHead` → KPI 줄(`Grid cols={4}` 의 `StatCard`) → 카드들 순으로 놓습니다.
  - `children: ReactNode`
  - `fluid?: boolean` (기본 false) — 최대 폭 해제(100%)
  - `maxWidth?: number | string` — 최대 폭 지정(설정·폼 화면은 480~720 권장)
  - `contentContainerStyle?: ViewStyle` — 내용 영역 스타일
  - `style?: ViewStyle` — 스크롤 뷰 자체
- **FullPageContainer** — 전체 영역을 쓰는 화면(자연어 질의처럼 내부에서 스크롤을 직접 관리). 스크롤 없이 `flex:1 · minHeight:0 · padding 24 (위 16) · maxWidth 1400`. 안의 카드에 `flex: 1` 을 줘 높이를 채웁니다. PageHead 는 쓰지 않습니다.
  - `children: ReactNode`
  - `style?: ViewStyle`

```jsx
<PageContainer>
  <PageHead title="설비 현황" desc="라인별 가동 상태와 금일 실적" />
  <Grid cols={4}><StatCard … /><StatCard … /></Grid>
  <Gap />
  <Card title="공정별 수율">…</Card>
</PageContainer>
```
