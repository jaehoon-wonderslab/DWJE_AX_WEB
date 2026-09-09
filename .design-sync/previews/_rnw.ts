/**
 * 미리보기 공통 셋업 — 모든 previews/<Name>.tsx 첫 줄에서 `import './_rnw';` 로 불러옵니다.
 *
 * react-native-web 은 번들 로드 시 <head> 에 <style id="react-native-stylesheet"> 를 만듭니다(규칙은 CSSOM 으로 넣어 innerHTML 은 빈 문자열).
 * 검증기(package-validate)는 `#root, [id^="r"]` 의 첫 요소를 마운트 루트로 보므로 이 style 요소가 잡혀 "root empty" 로 오판됩니다.
 * RNW 는 요소 참조를 들고 있어 id 를 바꿔도 동작에 영향이 없습니다.
 */
const el = typeof document !== 'undefined' ? document.getElementById('react-native-stylesheet') : null;
if (el) el.id = 'x-rnw-stylesheet'; // 'r' 로 시작하지 않는 id 여야 함
export {};
