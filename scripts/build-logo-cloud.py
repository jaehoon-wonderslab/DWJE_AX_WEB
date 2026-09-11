# CI 심볼 → 점 구름. scripts/build-logo-cloud.cjs 가 부릅니다.
from PIL import Image
import io

POINTS = 460
SRC = "src/assets/logo-mark.png"
OUT = "src/shared/components/brand/logoCloud.js"

im = Image.open(SRC).convert("RGBA")
W0, H0 = im.size
W = 150
H = max(1, round(W * H0 / W0))
px = im.resize((W, H), Image.LANCZOS).load()

# LogoMark 의 resizeMode="contain" 과 같은 규칙 — 긴 변 기준 정사각에 가운데 맞춤
long_side = max(W, H)
padx = (long_side - W) / 2
pady = (long_side - H) / 2

hits = []
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if a < 140:
            continue
        hits.append((round((x + padx) / long_side, 4), round((y + pady) / long_side, 4), "#%02x%02x%02x" % (r, g, b)))

step = max(1, len(hits) // POINTS)
picked = hits[::step]
xs = ",".join(str(p[0]) for p in picked)
ys = ",".join(str(p[1]) for p in picked)
cs = ",".join("'%s'" % p[2] for p in picked)

header = """/**
 * CI 심볼의 점 구름 — 빌드 시점에 뽑아 고정한 좌표·색
 *
 * `src/assets/logo-mark.png` 를 훑어 알파가 있는 픽셀을 고르게 솎은 것입니다.
 * 좌표는 **정사각 상자 기준 0~1** 이고, 심볼이 정사각이 아니므로(가로가 조금 깁니다)
 * LogoMark 의 resizeMode="contain" 과 같은 규칙으로 가운데 맞춤해 두었습니다.
 * 그래서 이 좌표로 만든 입자 형상과 진짜 심볼이 같은 자리에 겹칩니다.
 *
 * 색은 그 픽셀의 원래 색입니다 — 입자가 모이면 심볼의 그라디언트가 그대로 드러납니다.
 *
 * 왜 런타임에 읽지 않나 —
 *  Metro 의 require('....png') 는 숫자 asset id 로 풀립니다. 거기서 URL 을 얻으려면
 *  react-native-web 의 내부 모듈(AssetRegistry)을 직접 들여와야 합니다.
 *  내부 구현에 기대는 대신 값을 미리 뽑아 두었습니다. 비동기 로드도, 실패 경로도 없습니다.
 *
 * 이 파일은 손으로 고치지 마십시오. 심볼을 바꾸면 다시 뽑습니다.
 *   node scripts/build-logo-cloud.cjs
 */

"""

body = (
    "/** 정사각 상자(0~1) 기준 좌표 */\n"
    "const XS = [" + xs + "];\n"
    "const YS = [" + ys + "];\n\n"
    "/** @type {{x: number, y: number}[]} */\n"
    "export const LOGO_POINTS = XS.map((x, i) => ({ x, y: YS[i] }));\n\n"
    "/** 각 점의 색 — LOGO_POINTS 와 같은 순서 */\n"
    "export const LOGO_COLORS = [" + cs + "];\n"
)

io.open(OUT, "w", encoding="utf-8").write(header + body)
print("점 %d 개 → %s" % (len(picked), OUT))
