---
category: brand
---
# ConstellationField

시그니처 비주얼 — 수백~수천 개의 작은 **윤곽선 삼각형** 파티클이 뇌·구름 실루엣을 이루고 주변에 옅은 파티클이 흩어져 떠 있는 `<canvas>` 배경("지식은 위계가 아니라 분산된 지능"). 로그인·랜딩 히어로, 빈 상태의 배경, AI 브리핑 카드의 장식에 씁니다. 부모를 `position: absolute` 로 꽉 채우므로 **relative 컨테이너에 크기를 준 뒤** 그 안에 두고, 글·버튼은 그 위에 겹칩니다. 파티클은 제자리에서 천천히 떠돌고 이따금 번쩍이며, `prefers-reduced-motion` 이면 정지 화면으로 그립니다. 웹 전용(네이티브는 아무것도 그리지 않음).

**색 규칙** — 기본 팔레트(iris #8052ff · spark #ffb829 · 민트 · 하늘 · 마젠타 …)는 **잉크 #0B1440 등 어두운 배경 전용**입니다. 흰 패널 위에서는 export 된 `LIGHT_PALETTE`(잉크 계열 #0B1440 · #1E2A78 · #3F3AA8 · 앰버 · #00aeef …)를 넘기고 `opacity` 를 0.7~0.9 로 낮춥니다. 그라디언트·형광색이 허용되는 곳은 로고와 이 파티클만이며, 일반 UI 는 잉크 #0B1440 · 헤어라인 #DFE1E7 · 앰버는 데이터 채움/활성 점에만 씁니다. CI 블루 #0033a0 / 스카이 #00aeef 는 로고(및 LIGHT_PALETTE 의 한 점)에만.

## props
- `density?: number` — 파티클 양 배율. 기본 1 (형상 최대 1,800 + 주변 최대 360).
- `opacity?: number` — 전체 불투명도. 기본 1.
- `shape?: 'brain' | 'orb' | 'ambient'` — 중심 형상. `brain`(기본, 울퉁불퉁한 실루엣) · `orb`(원) · `ambient`(형상 없이 흩어진 파티클만).
- `centerX?: number` · `centerY?: number` — 형상 중심(0~1). 기본 0.5 / 0.5. 글을 왼쪽에 둘 때 0.7 정도로 밀어냅니다.
- `scale?: number` — 형상 반지름(짧은 변 대비). 기본 0.36.
- `animate?: boolean` — 드리프트·반짝임. 기본 true. 정적 캡처·인쇄는 false.
- `activity?: number` — 움직임 세기. 기본 1. 2 면 드리프트·반짝임 두 배, 형상이 천천히 공전(1 → 약 2분에 한 바퀴).
- `palette?: string[]` — 파티클 색 목록. 기본 어두운 배경용 형광 팔레트, 흰 배경은 `LIGHT_PALETTE`.
- `style?` — 바깥 View 스타일 덧씌우기.

```jsx
<div style={{ position: 'relative', width: 520, height: 260, background: '#0B1440', borderRadius: 16, overflow: 'hidden' }}>
  <ConstellationField shape="brain" density={1} />
  <LogoLockup size={28} light style={{ position: 'absolute', left: 24, bottom: 20 }} />
</div>
// 흰 카드 위
<ConstellationField shape="orb" palette={LIGHT_PALETTE} centerX={0.72} opacity={0.85} />
```
