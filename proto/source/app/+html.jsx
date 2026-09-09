/**
 * 웹 문서 셸 — 정적 렌더링(web.output: static)의 HTML 골격
 *
 * 브라우저에서만 쓰입니다. 글꼴 로드, 첫 페인트 배경색, 전역 CSS(스크롤 막대 · 선택 색 · 키프레임)를 둡니다.
 *  · 글꼴: Inter(라틴·숫자, 가이드의 PPNeueMontreal 대체) + Pretendard(한글)
 *  · 첫 페인트: 웜 그레이 캔버스(#f4f5f7) — 라이트 테마 하나로 동작합니다
 */
import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#f4f5f7" />
        <meta name="color-scheme" content="light" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GLOBAL_CSS = `
  html, body { background: #f4f5f7; color: #1C1C1C; }
  body {
    font-family: "Pretendard Variable", "Pretendard", "Inter", "Noto Sans KR", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    word-break: keep-all;
  }
  ::selection { background: rgba(30, 42, 120, 0.18); }
  :focus-visible { outline: 2px solid #1E2A78; outline-offset: 2px; border-radius: 6px; }

  /* 스크롤 막대 — 8px · 잉크 12% 썸 · 투명 트랙 */
  * { scrollbar-width: thin; scrollbar-color: rgba(11,20,64,0.12) transparent; }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: rgba(11,20,64,0.12); border-radius: 99px; }
  *::-webkit-scrollbar-thumb:hover { background: rgba(11,20,64,0.24); }

  /* 공통 키프레임 */
  @keyframes ax-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ax-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
  @keyframes ax-spin { to { transform: rotate(360deg); } }
  @keyframes ax-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;
