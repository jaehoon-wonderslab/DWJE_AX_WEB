// 테마 JS 토큰(src/shared/theme) → CSS 커스텀 프로퍼티. 실행: node .design-sync/gen-tokens.mjs
// 컴포넌트는 JS theme 객체를 읽지만, 디자인 에이전트가 직접 짜는 레이아웃 glue 는 이 변수를 씁니다.
import { build } from '../.ds-sync/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const r = await build({
  stdin: {
    contents: `export * from './src/shared/theme/theme.js'; export * from './src/shared/theme/colors.js';`,
    resolveDir: root, loader: 'js',
  },
  bundle: true, format: 'esm', write: false, platform: 'neutral',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
const theme = mod.createTheme('light');
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const lines = ['/* 덕우전자 AX 디자인 토큰 — src/shared/theme/{colors,theme}.js 에서 생성 (node .design-sync/gen-tokens.mjs) */', ':root {'];
lines.push('  /* 색 — "Soft-matte panels on warm gray": 캔버스 위 흰 패널, 잉크 #0B1440, 캡션 #787878, 앰버는 데이터 채움 전용 */');
for (const [k, v] of Object.entries(theme.color)) lines.push(`  --dwje-color-${kebab(k)}: ${v};`);
lines.push('  /* 표면·헤어라인 */');
for (const k of ['surface', 'surfaceHover', 'hairline', 'hairlineStrong', 'divider']) if (theme[k]) lines.push(`  --dwje-${kebab(k)}: ${theme[k]};`);
lines.push('  /* 차트 계열색 — 잉크 900 → 700 → 500 → 앰버 → 비강조 → 성공 */');
(theme.series || []).forEach((c, i) => lines.push(`  --dwje-series-${i + 1}: ${c};`));
lines.push('  /* 브랜드 고정색 — 로고·파티클 전용 */');
for (const [k, v] of Object.entries(mod.BRAND)) lines.push(`  --dwje-brand-${kebab(k)}: ${v};`);
lines.push('  /* 반지름·간격·치수 */');
for (const [k, v] of Object.entries(mod.METRICS)) lines.push(`  --dwje-${kebab(k)}: ${v}px;`);
lines.push('  /* 글꼴 — 한글 Pretendard, 라틴·숫자 Inter. 굵기는 500(라벨·본문) · 600(제목·수치) 만 */');
lines.push('  --dwje-font-sans: "Pretendard Variable", "Pretendard", "Inter", "Noto Sans KR", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;');
lines.push('  --dwje-font-num: "Inter", "Pretendard Variable", "Pretendard", sans-serif;');
lines.push('  --dwje-font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;');
lines.push('  --dwje-weight-body: 500;', '  --dwje-weight-strong: 600;');
lines.push('  --dwje-panel-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);');
lines.push('}');
writeFileSync(join(here, 'tokens', 'dwje-tokens.css'), lines.join('\n') + '\n');
// cssEntry 용 결합 파일 — 토큰 + 전역 CSS. styles.css 의 @import 폐쇄(closure)로 디자인에 전달됩니다.
writeFileSync(join(here, 'ds-styles.css'), lines.join('\n') + '\n\n' + readFileSync(join(here, 'ds-global.css'), 'utf8'));
console.log(`tokens: ${Object.keys(theme.color).length} colors, ${(theme.series || []).length} series, ${Object.keys(mod.METRICS).length} metrics → .design-sync/tokens/dwje-tokens.css`);
