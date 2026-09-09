---
category: icons
---
# Icon

외부 아이콘 폰트 없이 인라인 SVG(24×24 좌표계, lucide 계열 선 아이콘)로 그리는 아이콘. `name` 으로 고르고 `size`(기본 16) · `color`(기본 본문색 #1C1C1C) · `strokeWidth`(기본 1.6) 로 조절합니다. 색은 옆 글자색을 그대로 넘기는 것이 관례(캡션 #787878, 오류 #E5482D, 성공 #2E9E57, 링크 #1E2A78). 앰버 #F2C14E 는 활성 별표(`starFilled`) 같은 데이터 마커에만. 크기는 캡션 옆 12~14, 버튼 안 13~14, 아이콘 버튼 16, 빈 상태·머리말 20~24. 없는 이름을 주면 `info` 로 대체됩니다.

- `name: IconName` — 아래 59개 중 하나.
- `size?: number` — 기본 16. 정사각.
- `color?: string` — 기본 theme foreground. `starFilled` 는 채움색으로도 쓰임.
- `strokeWidth?: number` — 기본 1.6. 강조 2.0, 큰 장식 1.2.
- `style?` — Svg 에 전달.

**이름 목록(59)** — 내비·기본: `menu` `search` `bell` `moon` `sun` `settings` `logout` `user` `users` `lock` `shield` · 방향: `chevronUp` `chevronDown` `chevronLeft` `chevronRight` `arrowUp` `arrowDown` `arrowLeft` `arrowRight` · 동작: `close` `check` `plus` `minus` `edit` `trash` `refresh` `copy` `save` `download` `upload` `printer` `external` `link` `filter` `play` `send` `mic` · 상태·정보: `info` `alert` `triangle` `clock` `history` `calendar` `eye` `eyeOff` `star` `starFilled` `thumbsUp` `thumbsDown` `sparkles` `message` · 데이터·문서: `file` `book` `image` `database` `activity` `layers` `grid` `chart`

```jsx
<Icon name="alert" size={14} color="#E5482D" />
<Icon name="settings" size={20} strokeWidth={2} />
```
