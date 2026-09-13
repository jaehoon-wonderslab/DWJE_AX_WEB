/** 글자 크기에 맞춰 항목 간격 확보. 한글·전각은 1em, 영문도 보수적으로 0.8em. */
export function axisLabelWidth(labels, fontSize, minimum = 64) {
  return Math.max(minimum, ...labels.map(label => Math.ceil(
    Array.from(String(label ?? '')).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 1 : 0.8), 0) * fontSize + 28
  )));
}
