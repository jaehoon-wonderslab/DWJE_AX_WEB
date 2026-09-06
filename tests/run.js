#!/usr/bin/env node
/**
 * 테스트 실행 진입점
 *
 *   npm test                        전체 (API + 브라우저)
 *   npm run test:api                API 만 (브라우저·웹 서버 불필요)
 *   SPEC=05 npm test                파일명에 '05' 가 든 스펙만
 *   node tests/run.js 권한           묶음 이름에 '권한' 이 든 것만
 *
 * 환경변수
 *   API_URL           API 서버 (기본 http://localhost:8080)
 *   WEB_URL           웹 개발 서버 (기본 http://localhost:8081)
 *   TEST_PASSWORD     시드 계정 공통 비밀번호 (기본 Dwje!2026)
 *   TEST_VERIFY_CODE  이메일 인증 고정 코드 (서버가 로컬 고정 코드를 쓸 때)
 *   API_LOG           서버 로그 파일 (고정 코드가 없을 때 코드를 읽습니다)
 *   HEADED=1          브라우저를 눈에 보이게 띄웁니다
 *   NO_BROWSER=1      브라우저 스펙을 건너뜁니다
 */
const fs = require('fs');
const path = require('path');
const { run } = require('./lib/runner');

/** 브라우저가 필요한 스펙 — NO_BROWSER=1 이면 건너뜁니다 */
// 08(페이징 표시)·09(집계 단위)도 화면을 열어 확인합니다 — 빠뜨리면 NO_BROWSER=1 에서 터집니다
const BROWSER_SPECS = ['06-', '07-', '08-', '09-'];

const only = process.env.SPEC;
const noBrowser = process.env.NO_BROWSER === '1';
const dir = path.join(__dirname, 'specs');

fs.readdirSync(dir)
  .filter((f) => f.endsWith('.spec.js'))
  .filter((f) => !only || f.includes(only))
  .filter((f) => !(noBrowser && BROWSER_SPECS.some((b) => f.startsWith(b))))
  .sort()
  .forEach((f) => require(path.join(dir, f)));

run().then((failed) => process.exit(failed ? 1 : 0));
