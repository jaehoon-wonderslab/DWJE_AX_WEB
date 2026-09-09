---
category: brand
---
# LogoMark · LogoLockup

덕우전자 CI 'D' 심볼의 재해석 SVG 마크. 두 획으로 이루어집니다 — **보울**(D 의 바깥 곡선, CI 블루 #0033a0 → #1f6fe0 세로 그라디언트)과 **슬래시**(D 의 기둥을 앞으로 기울인 획, 스카이 #00aeef → #8fe3ff 대각 그라디언트). `LogoMark` 는 마크만, `LogoLockup` 은 마크 + "덕우전자 AX" 워드마크 + 태그라인(AI Decision Layer)을 가로로 묶은 잠금(lockup)입니다.

**브랜드 색 규칙** — CI 블루 #0033a0 과 스카이 #00aeef, 그리고 그라디언트는 **로고(와 파티클)에만** 씁니다. 버튼·배지·차트 등 UI 에서는 잉크 #0B1440 을 주색으로, 앰버 #F2C14E 는 데이터 채움·활성 점에만 씁니다. 로고 주변에는 마크 한 변의 절반 이상 여백을 두고, 마크를 늘리거나 색을 바꾸지 않습니다. 인쇄·비활성·워터마크는 `mono` 로 현재 글자색 단색을 씁니다(슬래시는 55% 불투명).

크기 관례: 16(파비콘·탭) · 24(상단 바, compact 잠금) · 28~32(사이드바 머리말 잠금) · 48~64(로그인 히어로).

## LogoMark props
- `size?: number` — 한 변(px). 기본 32.
- `mono?: boolean` — 단색(테마 글자색). 기본 false.
- `style?` — Svg 스타일.

## LogoLockup props
- `size?: number` — 마크 크기(px). 워드마크 글자 크기는 `size*0.56`, AX 는 `size*0.42` 로 따라갑니다. 기본 28.
- `compact?: boolean` — 태그라인 없이 한 줄(사이드바 접힘·상단 바). 기본 false.
- `light?: boolean` — 어두운 배경용. 글자 흰색 · 태그라인 60% 흰색 · AX 스카이블루. 기본 false(글자 잉크 #0B1440 · AX #1E2A78).
- `style?` — 바깥 컨테이너 스타일.

```jsx
<LogoMark size={48} />
<LogoLockup size={28} />
<div style={{ background: '#0B1440', padding: 20 }}>
  <LogoLockup size={24} compact light />
</div>
```
