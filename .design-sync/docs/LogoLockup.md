---
category: brand
---
# LogoLockup

`LogoMark` + "덕우전자 AX" 워드마크 + 태그라인(AI DECISION LAYER)의 가로 잠금. 사이드바 머리말·로그인 화면·보고서 머리말에 씁니다. `compact` 는 태그라인을 빼고 한 줄로(사이드바 접힘·상단 바), `light` 는 어두운 잉크 패널 위에서 글자를 흰색·AX 를 스카이블루 #00aeef 로 고정합니다. 워드마크는 Pretendard 600, 글자 크기는 `size` 에 비례합니다. 자세한 규칙은 LogoMark 문서를 보세요 — CI 블루/스카이/그라디언트는 로고에만, UI 는 잉크 #0B1440.

- `size?: number` 마크 크기(px), 기본 28 · `compact?: boolean` · `light?: boolean` · `style?`

```jsx
<LogoLockup size={28} />
<LogoLockup size={24} compact light />
```
