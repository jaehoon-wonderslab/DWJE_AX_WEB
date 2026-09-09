---
category: actions
---
# Button · IconButton · ButtonRow

동작 버튼 체계(CM-05). `Button` 은 네 변형을 가집니다 — `primary` 는 잉크 네이비(#0B1440) 채움 · 14px 반지름 · 흰 글자 600 으로 **화면에 하나만** 두는 주요 동작(조회·저장·승인), `outline`(기본값) 은 흰 배경 · rgba(0,0,0,.06) 테두리 · 12px 반지름의 보조 동작, `ghost` 는 배경·테두리 없이 잉크 700(#1E2A78) 글자만 쓰는 3차 동작·링크(취소·상세 보기), `danger` 는 붉은 틴트 배경(#E5482D 6%) + 붉은 글자로 되돌리기 어려운 동작(삭제·폐기)입니다. 높이는 md 34px / sm 28px, 라벨은 12.5px(sm 12px) · weight 500 · 한 줄(`numberOfLines=1`). 앰버는 버튼에 쓰지 않습니다. 호버는 outline/ghost → #FAFAFA, primary → 잉크 700, danger → 12% 틴트, pressed 는 opacity .85, disabled 는 opacity .45.

`IconButton` 은 34×34 정사각 아이콘 버튼(헤더·카드 머리말 동작). 흰 배경 · 옅은 테두리 · 12px 반지름, `active` 이면 #F4F5F6 채움 + 잉크 아이콘. `ButtonRow` 는 버튼을 gap 8 로 가로 배열하는 flex 묶음(`flexWrap`)이며 `style` 로 정렬을 바꿉니다. 폼 하단 관례는 오른쪽 정렬로 `ghost 취소` + `primary 확정`, 조회 조건 아래는 `primary 조회` + `outline 초기화/엑셀` 입니다.

**Button props**
- `label: string` — 버튼 글자(한 줄).
- `variant?: 'primary' | 'outline' | 'ghost' | 'danger'` — 기본 `'outline'`.
- `size?: 'md' | 'sm'` — 기본 `'md'`(34px). `'sm'` 은 28px, 카드 머리말·표 안.
- `icon?: string` — 왼쪽 아이콘 이름(`Icon` 의 name). 크기 14(sm 13), 색은 변형을 따름.
- `disabled?: boolean` — 기본 `false`. opacity .45, onPress 무시.
- `onPress?: () => void`
- `style?`, `textStyle?` — 컨테이너·라벨 스타일 덧씌우기.

**IconButton props**
- `name: string` — 아이콘 이름. `title?: string` — 접근성 라벨(툴팁 문구).
- `size?: number`(기본 34) · `iconSize?: number`(기본 16).
- `active?: boolean` — 기본 `false`. 선택된 보기 토글에.
- `color?: string` — 아이콘 색 강제(파괴적 동작 등). `onPress?`, `style?`.

**ButtonRow props**
- `children`, `style?` — 예: `{ justifyContent: 'flex-end' }`.

```jsx
<ButtonRow>
  <Button label="조회" variant="primary" onPress={fetchList} />
  <Button label="초기화" onPress={reset} />
  <Button label="엑셀" icon="download" onPress={exportXls} />
  <IconButton name="printer" title="인쇄" onPress={print} />
</ButtonRow>
```
