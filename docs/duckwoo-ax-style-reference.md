# 덕우전자 AX 워크스페이스 — Style Reference

> soft-matte panels floating on warm gray

**Theme:** light

The 덕우전자 AX 워크스페이스 is a soft-matte productivity surface: a warm gray page canvas (`#f4f5f7`) holding three white panels — collapsible sidebar, chat/content canvas, and metric rail — each a large 24px-radius card with a near-invisible hairline border and a wide, low-opacity drop shadow. Nothing touches the window edge; a uniform 16px gutter of canvas shows around and between every panel, which is what produces the floating quality. Typography is Pretendard/Inter at small, dense sizes (10.5–21px) with weight 500 as the working default and 600 for every heading and numeral — hierarchy comes from color and weight, not scale. Ink navy `#0B1440` carries headings and primary data; `#787878` carries all secondary labels. Amber `#F2C14E` is the point color and appears only as a data fill, a warning marker, or an active-item dot — never as text and never as a large surface. Layout is information-dense but never crowded: nested `#FAFAFA` sub-cards at 16px radius group statistics inside the white panels, and charts are pure CSS (linear-gradient bars, conic-gradient donuts, pill progress tracks) rather than an imported chart library. Korean copy is written in the polite-formal 합니다체, with `word-break: keep-all` applied to every text block so Korean lines never break mid-word.

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas Warm Gray | `#f4f5f7` | `--color-canvas` | Page background behind all panels, and the 16px gutter between them — the warm tint is what keeps white panels reading as elevated cards |
| Panel White | `#ffffff` | `--color-panel` | Sidebar, chat canvas, metric rail, sticky headers, chips, small icon buttons — the primary surface |
| Subtle Fill | `#FAFAFA` | `--color-subtle` | Nested stat cards, briefing card, sidebar footer, collapse button, meta chips — the second-level surface inside a white panel |
| Track Gray | `#F4F5F6` | `--color-track` | Progress-bar and gauge tracks, hover fill for chips and buttons — the same value family as the canvas, used inside panels |
| Hairline | `#DFE1E7` | `--color-line` | Header bottom border, card dividers, briefing card border, "no data / remainder" segment in donuts — the default 1px separator |
| Ink 900 Navy | `#0B1440` | `--color-ink-900` | All headings, primary KPI numerals, chart primary series, AI sparkle icon, active nav label |
| Ink 700 Blue | `#1E2A78` | `--color-ink-700` | Avatar fill, link color, chart second series, secondary emphasis |
| Ink 500 Indigo | `#3F3AA8` | `--color-ink-500` | Chart third series and the default bar color for non-highlighted data points |
| Body Ink | `#1C1C1C` | `--color-text` | Body copy, chip labels, gauge values, target reference lines |
| Secondary Gray | `#3C3C3C` | `--color-text-2` | Paragraph text inside cards, inactive nav labels, quick-action chip labels |
| Muted Gray | `#787878` | `--color-text-3` | Every caption, label, timestamp, unit, breadcrumb and chevron — the most-used text color after body ink |
| Point Amber | `#F2C14E` | `--accent` | Active sidebar item dot, warning-level bars and list markers, one donut segment, gauge fill — a fill only, never text |
| Error Red | `#E5482D` | `--color-error` | Threshold-exceeded bars, critical alert markers, unregistered-downtime callouts |
| Success Green | `#2E9E57` | `--color-success` | Session-active dot, confirmed report markers, improving-trend annotations |
| Success Tint | `#EAF6EC` | `--color-success-tint` | Background of the "질의 세션 활성" status capsule — the only tinted capsule in the shell |
| Neutral Data Gray | `#B4B8CC` | `--color-data-mute` | De-emphasized historical bars, so the current period reads as the focus |

---

## Tokens — Typography

### Pretendard / Inter

Pretendard leads for Korean, Inter for Latin and all numerals; the stack is declared once on `body` and inherited everywhere (buttons re-declare `font-family: inherit`). Every numeral display — KPI values, gauge readouts, donut centers — explicitly switches to `Inter, Pretendard` so figures align on tabular-feeling widths. Weight 500 is the default for labels and body, 600 for all titles and numbers; weight 400 and 700 do not appear. The scale is deliberately small and half-step (10.5, 11.5, 12.5) to fit dense production data inside fixed panel heights — hierarchy is carried by color and weight, not size. Negative tracking (-0.02em) is applied only to headings and numerals; label text runs at normal or slightly positive (+0.02em) tracking. · `--font-sans`

- **Substitute:** Inter, Noto Sans KR
- **Weights:** 500, 600
- **Sizes:** 10, 10.5, 11, 11.5, 12, 12.5, 13, 17, 18, 21px
- **Line height:** 1.4, 1.5, 1.6, 1.65, 1.7
- **Letter spacing:** -0.02em on headings and numerals; 0.02em on small uppercase-ish labels; normal on body
- **Role:** Korean-first dense product UI. Pretendard for Hangul, Inter for Latin/numerals, weight 500/600 only.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Weight | Token |
|------|------|-------------|----------------|--------|-------|
| micro | 10px | 1.4 | — | 500 | `--text-micro` |
| caption | 10.5px | 1.5 | — | 500 | `--text-caption` |
| label | 11px | 1.4 | 0.02em | 500/600 | `--text-label` |
| meta | 11.5px | 1.4–1.5 | — | 500 | `--text-meta` |
| body-sm | 12px | 1.65 | — | 500 | `--text-body-sm` |
| body | 12.5px | 1.6 | — | 500 | `--text-body` |
| chat | 13px | 1.7 | — | 500 | `--text-chat` |
| card-title | 13px | 1.4 | — | 600 | `--text-card-title` |
| numeral-sm | 17–18px | 1.2 | -0.02em | 600 | `--text-numeral-sm` |
| heading | 18px | 1.4 | -0.02em | 600 | `--text-heading` |
| numeral | 21px | 1.2 | -0.02em | 600 | `--text-numeral` |
| page-title | 21px | 1.4 | -0.02em | 600 | `--text-page-title` |

---

## Tokens — Spacing & Shapes

**Base unit:** 4px (with frequent 2px half-steps at small scales)

**Density:** compact

### Spacing Scale

| Name | Value | Token | Typical use |
|------|-------|-------|-------------|
| 2 | 2px | `--spacing-2` | Gap between stacked nav rows |
| 4 | 4px | `--spacing-4` | Inner label/value gap |
| 6 | 6px | `--spacing-6` | Chip gaps, dot gaps |
| 8 | 8px | `--spacing-8` | Icon-to-label, button clusters |
| 10 | 10px | `--spacing-10` | Card grid gaps, avatar row |
| 12 | 12px | `--spacing-12` | Divider padding, briefing rows |
| 14 | 14px | `--spacing-14` | Stat card padding, section gaps |
| 16 | 16px | `--spacing-16` | Panel gutter, canvas padding, card gaps |
| 18 | 18px | `--spacing-18` | Card horizontal padding |
| 20 | 20px | `--spacing-20` | Header padding |
| 24 | 24px | `--spacing-24` | Content region padding, panel radius |

### Border Radius

| Element | Value |
|---------|-------|
| panels (sidebar, chat, rail) | 24px |
| nested cards, gauges, briefing | 16px |
| ask button | 14px |
| nav rows, collapse button, icon buttons | 12px |
| sub-nav items | 10px |
| capsules, chips, dots, progress tracks | 999px |

### Layout

- **Shell:** `display: flex` with `height: 100vh`, `padding: 16px`, `gap: 16px`, `overflow: hidden` — the app never scrolls as a whole; each panel scrolls independently.
- **Sidebar width:** ~228px open / ~64px collapsed (driven by a flex + min-width pair, animated only by layout).
- **Content column max-width:** 640–720px centered, so hero, briefing, composer and messages share one optical spine.
- **Chart grids:** `grid-template-columns: repeat(2, minmax(0, 1fr))` — two-up, never horizontally scrolling.
- **Panel padding:** 18–24px; nested card padding 14–18px.
- **Message bubble max-width:** 78% of the column.

---

## Components

### Floating Panel

**Role:** The shell's three primary regions

`background: #ffffff`, `border: 1px solid rgba(0,0,0,0.03)`, `border-radius: 24px`, `box-shadow: 0 10px 30px rgba(0,0,0,0.04)`. The border is almost invisible by design — it only prevents the white from bleeding into the canvas at the shadow's edge. Panels never sit flush; they always have 16px of canvas around them. `overflow-y: auto` with a custom 8px scrollbar (`rgba(11,20,64,0.12)` thumb, transparent track).

### Sticky Panel Header

**Role:** Status and controls at the top of a scrolling panel

`position: sticky; top: 0`, white background, `border-bottom: 1px solid #DFE1E7`, `padding: 18px 20px`. Holds a status capsule left, a muted context line that ellipsizes in the middle, and 34×34px square icon buttons right. No shadow — the hairline alone separates it from scrolling content.

### Status Capsule

**Role:** Live session / state indicator

Pill (`border-radius: 999px`), `padding: 6px 12px`, tinted background (`#EAF6EC` for active), a 6px colored dot (`#2E9E57`), and an 11.5px weight-500 `#1C1C1C` label. The only tinted-background element in the chrome; all other chips are white or `#FAFAFA`.

### Nav Row (Accordion Group)

**Role:** Sidebar section header

`padding: 9px 10px`, `border-radius: 12px`, 16px icon + 12.5px label + 14px chevron. Active state raises weight to 600 and color to `#0B1440` with a `#FAFAFA` fill; inactive is weight 500 `#3C3C3C`. Hover is `#FAFAFA`. Labels ellipsize rather than wrap. Sub-items indent 14px, drop to 12px/10px radius, and carry a 5px dot — amber `#F2C14E` when selected, `#DFE1E7` otherwise.

### Nested Stat Card

**Role:** A single KPI inside a panel

`padding: 14px`, `border-radius: 16px`, `background: #FAFAFA`, no border. Three stacked lines: 10.5px `#787878` label, 21px weight-600 `#0B1440` value in Inter with -0.02em tracking, then a 10.5px hint line whose color encodes direction (green/amber/red/gray). Laid out in a 2-column `minmax(0,1fr)` grid.

### Briefing Card

**Role:** The agent's daily summary, the chat canvas's centerpiece

`padding: 16px 18px`, `border: 1px solid #DFE1E7`, `border-radius: 16px`, `background: #FAFAFA`. Header row: `ai` sparkle icon in `#0B1440`, 13px weight-600 title, right-aligned 10.5px timestamp, separated by a 12px-padded `#DFE1E7` bottom border. Body is a stack of heading (12px/600) + paragraph (12px, `#3C3C3C`, line-height 1.65, `white-space: pre-line`). Footer repeats the divider and holds quick-action chips.

### Quick Action Chip

**Role:** Suggested natural-language query

White pill, `border: 1px solid rgba(0,0,0,0.07)`, `padding: 7px 12px`, 11.5px weight-500 `#3C3C3C`, with a 6px leading dot whose color maps to the target domain. Hover `#F4F5F6`. Wraps in a `flex-wrap` row with 6px gaps; text uses `word-break: keep-all` and `line-height: 1.4` so two-line chips stay legible.

### Ask Button

**Role:** Primary action — submit a natural-language query

Filled ink navy, `border: 0`, `border-radius: 14px`, `padding: 8px 14px`, white 15px `ai` sparkle icon + label. This is the only filled dark button in the UI; every other control is white or `#FAFAFA`. Amber is never used for a button fill here — it stays a data color.

### Icon Button

**Role:** Secondary panel action (new chat, history, more)

34×34px square, `border: 1px solid rgba(0,0,0,0.06)`, `border-radius: 12px`, white fill, `#3C3C3C` 16px icon from the design-system set. Hover `#FAFAFA`. Always `title`-labeled.

### Chat Message Bubble

**Role:** User and agent turns

`max-width: 78%`, `padding: 12px 15px`, `border-radius: 16px`, 13px text at line-height 1.7, `white-space: pre-wrap`, `word-break: keep-all`. The agent bubble is white with a hairline border; the user bubble is a filled tint aligned right. Alignment, fill, ink and border are all data-driven per message.

### CSS Bar Chart

**Role:** Period comparison

Horizontal rows: a 70px fixed label column (11.5px `#3C3C3C`, ellipsized), then a 9px-tall `#F4F5F6` pill track holding a colored fill and, optionally, a 2px `#1C1C1C` vertical target marker. Color encodes status per bar: `#0B1440` current, `#3F3AA8` normal, `#B4B8CC` de-emphasized history, `#F2C14E` warning, `#E5482D` threshold breach. A 12px caption below explains the target line.

### CSS Donut

**Role:** Composition of a whole (equipment uptime split)

116px circle painted with a `conic-gradient` in ink → amber → `#DFE1E7` order, with a white `inset: 24px` circle punched out to hold a 17px weight-600 navy value and a 10px `#787878` label. Legend rows sit beside it: 8px color swatch, name, right-aligned percentage.

### Vertical Gauge

**Role:** Headline rates, side by side

48×132px `#F4F5F6` rounded (16px) column with a bottom-anchored gradient fill (`linear-gradient(180deg, …)` in amber / navy / indigo). The 18px weight-600 value sits above the column, the label below — value first, so the row scans as numbers.

### Alert List Item

**Role:** Agent-raised anomaly

A row with a leading color marker (red / amber / gray / `#DFE1E7` by severity), 12px weight-600 title, 12px `#3C3C3C` description, and a 10.5px `#787878` meta line naming the responsible agent and elapsed time. Clicking pushes the title into the chat as a query.

---

## Do's and Don'ts

### Do

- Keep the 16px canvas gutter on all four sides and between panels — the floating-panel read depends on it, and no panel should ever touch the window edge
- Use `#f4f5f7` for the canvas and `#ffffff` for panels; the warm gray is what makes white read as elevated
- Use exactly `border: 1px solid rgba(0,0,0,0.03)` + `box-shadow: 0 10px 30px rgba(0,0,0,0.04)` on top-level panels — one soft wide shadow, never a tight dark one
- Nest secondary content in `#FAFAFA` cards at 16px radius inside white panels; that two-level surface system is the layout's whole structure
- Set every heading and every numeral to weight 600 with -0.02em tracking, and switch numerals to `Inter, Pretendard` so figures align
- Apply `word-break: keep-all` to every Korean text block, and `line-height: 1.6–1.7` to paragraphs
- Reserve `#F2C14E` amber for data fills, active dots and warning markers only
- Write UI copy in Korean polite-formal 합니다체 ("질의하십시오", "검토하십시오"), labels short and declarative
- Give charts two-up `repeat(2, minmax(0,1fr))` grids so nothing scrolls horizontally
- Use only the design-system icon set at 13–18px, colored via `currentColor`
- Let each panel scroll independently with the 8px `rgba(11,20,64,0.12)` scrollbar; the shell itself is `overflow: hidden`

### Don't

- Do not use amber as a text color, a button fill, or a panel background — on this surface it is a data color only
- Do not introduce gradients on surfaces; gradients appear only inside gauge fills and chart bars
- Do not raise body or label text above weight 500, or headings above 600 — no bold, no 700
- Do not scale up for hierarchy; the ceiling is 21px, and emphasis comes from `#0B1440` versus `#787878`
- Do not add a second tinted capsule background beyond the green session state — other chips stay white or `#FAFAFA`
- Do not use emoji or unicode-glyph icons; every glyph comes from the design-system SVG set
- Do not put borders on nested `#FAFAFA` stat cards — the fill alone separates them
- Do not exceed the 640–720px centered content column for hero, briefing, composer and messages; they must share one spine
- Do not let panels or chart rows set fixed heights that clip Korean text — grow the panel, don't clip
- Do not use browser-default link blue; links are `#1E2A78` hovering to `#0B1440`

---

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#f4f5f7` | Page background and the gutter between panels |
| 1 | Panel | `#ffffff` | Sidebar, chat canvas, metric rail, sticky headers |
| 2 | Subtle | `#FAFAFA` | Nested stat cards, briefing card, sidebar footer, hover fills |
| 3 | Track | `#F4F5F6` | Gauge and progress tracks, pressed/hover state on chips |
| 4 | Ink | `#0B1440` / `#1E2A78` | Filled primary button, avatar, chart primary series |

---

## Elevation

One shadow, used once: `0 10px 30px rgba(0,0,0,0.04)` on the three top-level panels. It is wide, very low opacity, and offset downward — the panels read as resting a few millimeters above the canvas rather than popping. Everything inside a panel is separated by fill change or a 1px `#DFE1E7` hairline, never by another shadow. Borders are the workhorse: `rgba(0,0,0,0.03)` for panels, `rgba(0,0,0,0.05–0.07)` for buttons and chips, `#DFE1E7` for dividers. No modal-scale shadow appears in the shell.

---

## Imagery

No photography, no illustration. Brand presence is two extracted 덕우전자 marks: the signature wordmark (`assets/derkwoo-signature.png`, 128px wide in the expanded sidebar) and the symbol mark (`assets/derkwoo-symbol.png`, 30px in the collapsed rail, 36px in the chat hero). All data visualization is hand-built from CSS — `linear-gradient` gauge fills, `conic-gradient` donuts, pill progress tracks with absolute-positioned target markers — so there is no chart-library aesthetic. Icons are the design system's 24×24 line set rendered at 13–18px in `currentColor`. The `ai` four-point sparkle is the agent's consistent marker: it appears in the briefing header and on the ask button, nowhere else.

---

## Layout

Three-column app shell inside a `100vh` flex container with 16px padding and 16px gaps, `overflow: hidden` at the shell level. Left: collapsible sidebar (~228px → ~64px) with logo block, collapse toggle, accordion nav, and a bottom-pinned user card. Center: the primary canvas — a sticky header, then a scrolling region that in the home state stacks hero → agent briefing → metric cards → charts → messages in a single 640–720px centered column, and in section states stacks a page header (breadcrumb, 21px title, description, ask button) above two-up content grids. Right: an optional metric rail carrying gauges, donut, equipment status and alert list; it collapses into the center canvas when space is tight. Every page carries a natural-language query entry point so the agent is reachable from anywhere. Density is compact but airy — small type, tight gaps, but generous panel padding and two levels of surface to keep grouping legible.

---

## Agent Prompt Guide

### Quick Color Reference

- **Text:** `#0B1440` (headings/numerals), `#1C1C1C` (body), `#3C3C3C` (in-card paragraphs), `#787878` (all captions and labels)
- **Background:** `#f4f5f7` (canvas), `#ffffff` (panels), `#FAFAFA` (nested cards), `#F4F5F6` (tracks/hover)
- **Border:** `rgba(0,0,0,0.03)` panels, `rgba(0,0,0,0.06)` controls, `#DFE1E7` dividers
- **Accent:** `#F2C14E` amber — data fills, active dots, warnings only
- **Data series:** `#0B1440` → `#1E2A78` → `#3F3AA8` → `#B4B8CC`
- **Status:** `#2E9E57` success, `#F2C14E` caution, `#E5482D` breach
- **Primary action:** `#0B1440` filled, white label, 14px radius

### Example Component Prompts

1. **App Shell**: `display: flex; height: 100vh; gap: 16px; padding: 16px; background: #f4f5f7; overflow: hidden`. Three children, each `background: #ffffff; border: 1px solid rgba(0,0,0,0.03); border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow-y: auto`. Sidebar `flex: 0 0 228px`, center `flex: 1 1 0; min-width: 0`, rail `flex: 0 0 320px`.

2. **KPI Card Grid**: `display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px`. Each cell `padding: 14px; border-radius: 16px; background: #FAFAFA`, stacking a 10.5px weight-500 `#787878` label, a 21px weight-600 `#0B1440` value in `Inter, Pretendard` at -0.02em tracking, and a 10.5px hint line in `#2E9E57` / `#F2C14E` / `#E5482D`.

3. **Sticky Panel Header**: `position: sticky; top: 0; z-index: 2; padding: 18px 20px; background: #ffffff; border-bottom: 1px solid #DFE1E7; display: flex; align-items: center; gap: 12px`. Left: pill capsule `padding: 6px 12px; border-radius: 999px; background: #EAF6EC` with a 6px `#2E9E57` dot and an 11.5px `#1C1C1C` label. Right: 34×34px icon buttons, `border-radius: 12px; border: 1px solid rgba(0,0,0,0.06)`, `#3C3C3C` 16px icons.

4. **Bar Chart Row**: `display: flex; align-items: center; gap: 10px`. Label `flex: 0 0 70px`, 11.5px weight-500 `#3C3C3C`, ellipsized. Track `flex: 1 1 auto; height: 9px; border-radius: 999px; background: #F4F5F6; overflow: hidden`, fill `width: <pct>; background: #3F3AA8` (or `#0B1440` current, `#F2C14E` caution, `#E5482D` breach), plus an absolute 2px `#1C1C1C` target marker. Caption below: 12px `#787878`, `word-break: keep-all`.

5. **Ask Bar**: White row inside the panel, `border-radius: 16px`, hairline `#DFE1E7` border, 12.5px placeholder in `#787878`, and a right-aligned filled button: `background: #0B1440; color: #ffffff; border: 0; border-radius: 14px; padding: 8px 14px`, 15px `ai` sparkle icon + Korean label.

6. **Sidebar Nav Item**: Row `padding: 9px 10px; border-radius: 12px; cursor: pointer`, hover `#FAFAFA`, active `background: #FAFAFA` with 12.5px weight-600 `#0B1440` label. Sub-items: `padding: 7px 10px; border-radius: 10px; margin-left: 14px`, 12px label, leading 5px dot — `#F2C14E` selected, `#DFE1E7` otherwise.

---

## Similar Products

- **Linear** — same restrained neutral shell with one accent held back for state, dense small type, and hairline-over-shadow separation
- **Notion** — comparable warm-neutral canvas with soft-radius panels and a quiet sidebar accordion
- **Vercel Dashboard** — similar white-card-on-gray metric layout with CSS-drawn charts and muted data series
- **Toss / 카카오워크** — the Korean-first density model: Pretendard at small sizes, weight 500/600 only, `keep-all` line breaking, polite-formal copy

---

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors — surfaces */
  --color-canvas: #f4f5f7;
  --color-panel: #ffffff;
  --color-subtle: #FAFAFA;
  --color-track: #F4F5F6;
  --color-line: #DFE1E7;

  /* Colors — ink & text */
  --color-ink-900: #0B1440;
  --color-ink-700: #1E2A78;
  --color-ink-500: #3F3AA8;
  --color-text: #1C1C1C;
  --color-text-2: #3C3C3C;
  --color-text-3: #787878;

  /* Colors — accent & status */
  --accent: #F2C14E;
  --accent-hover: #DBA82F;
  --accent-pressed: #B0851F;
  --accent-on: #0B1440;
  --color-error: #E5482D;
  --color-success: #2E9E57;
  --color-success-tint: #EAF6EC;
  --color-data-mute: #B4B8CC;

  /* Borders */
  --border-panel: 1px solid rgba(0, 0, 0, 0.03);
  --border-control: 1px solid rgba(0, 0, 0, 0.06);
  --border-chip: 1px solid rgba(0, 0, 0, 0.07);
  --border-divider: 1px solid #DFE1E7;

  /* Typography */
  --font-sans: Pretendard, Inter, "Noto Sans KR", system-ui, sans-serif;
  --font-num: Inter, Pretendard, sans-serif;

  --text-micro: 10px;
  --text-caption: 10.5px;
  --text-label: 11px;
  --text-meta: 11.5px;
  --text-body-sm: 12px;
  --text-body: 12.5px;
  --text-chat: 13px;
  --text-card-title: 13px;
  --text-numeral-sm: 18px;
  --text-heading: 18px;
  --text-numeral: 21px;
  --text-page-title: 21px;

  --leading-tight: 1.4;
  --leading-label: 1.5;
  --leading-body: 1.6;
  --leading-paragraph: 1.65;
  --leading-chat: 1.7;

  --tracking-heading: -0.02em;
  --tracking-label: 0.02em;

  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-20: 20px;
  --spacing-24: 24px;

  /* Radius */
  --radius-panel: 24px;
  --radius-card: 16px;
  --radius-action: 14px;
  --radius-control: 12px;
  --radius-subitem: 10px;
  --radius-full: 999px;

  /* Elevation */
  --shadow-panel: 0 10px 30px rgba(0, 0, 0, 0.04);

  /* Layout */
  --shell-gutter: 16px;
  --sidebar-open: 228px;
  --sidebar-collapsed: 64px;
  --content-column: 720px;
  --panel-padding: 20px;
  --card-padding: 14px;

  /* Data gradients */
  --grad-amber: linear-gradient(180deg, #F7D680 0%, #F2C14E 100%);
  --grad-navy: linear-gradient(180deg, #46539f 0%, #1E2A78 100%);
  --grad-indigo: linear-gradient(180deg, #6f6ac9 0%, #3F3AA8 100%);
  --grad-gray: linear-gradient(180deg, #d3d6e2 0%, #B4B8CC 100%);
}
```

### Tailwind v4

```css
@theme {
  --color-canvas: #f4f5f7;
  --color-panel: #ffffff;
  --color-subtle: #FAFAFA;
  --color-track: #F4F5F6;
  --color-line: #DFE1E7;
  --color-ink-900: #0B1440;
  --color-ink-700: #1E2A78;
  --color-ink-500: #3F3AA8;
  --color-text: #1C1C1C;
  --color-text-2: #3C3C3C;
  --color-text-3: #787878;
  --color-accent: #F2C14E;
  --color-error: #E5482D;
  --color-success: #2E9E57;
  --color-success-tint: #EAF6EC;
  --color-data-mute: #B4B8CC;

  --font-sans: Pretendard, Inter, "Noto Sans KR", system-ui, sans-serif;
  --font-num: Inter, Pretendard, sans-serif;

  --text-micro: 10px;
  --text-caption: 10.5px;
  --text-label: 11px;
  --text-meta: 11.5px;
  --text-body-sm: 12px;
  --text-body: 12.5px;
  --text-chat: 13px;
  --text-heading: 18px;
  --text-numeral: 21px;

  --radius-panel: 24px;
  --radius-card: 16px;
  --radius-action: 14px;
  --radius-control: 12px;
  --radius-subitem: 10px;

  --shadow-panel: 0 10px 30px rgba(0, 0, 0, 0.04);
}
```
