/**
 * [Controller] AOI 시리얼 한 건의 회차 상세 — 모달 안에서만 씁니다
 *
 * 목록에서 행을 누르면 화면이 모달을 열고, 모달 컴포넌트가 이 훅으로 상세를 직접 받습니다.
 * (모달 내용은 전역 모달 스토어의 render 로 그려지므로, 바깥 컨트롤러 상태로는 다시 그려지지 않습니다.)
 *
 * ■ 2026-09-14 — 원천이 **DIMENSION(MSSQL)** 으로 바뀌었습니다
 * 예전 MES 라벨 이력(`measurements[{seq,passed,values[]}]`)을 함께 읽던 갈래는 지웠습니다.
 * 그 설비 집합(VNA-*)은 DIMENSION(GP-*·MQ-*)과 아예 달라 이 화면에 한 건도 오지 않습니다.
 *
 * 상세 응답 (`GET /quality/aoi/dimension/serials/{serialKey}`)
 *  · 시리얼 정보 — `wcCd·eqptCd·lotNo·serialNo·seqCnt·failSeqCnt·failRate·cavity·firstAt·lastAt`
 *  · `items[{ seq, passed, measuredAt, measurements[{no,value}], violFais[] }]`
 *    한 행(SEQ)이 치수 45~58개를 통째로 갖습니다 — SEQ 는 검사 항목 번호가 아니라 **제품 1개의 측정 회차**입니다.
 *    쓰는 FAI 개수는 설비마다 다릅니다(S110 45개 · S120 58개). 그래서 열은 응답이 준 `faiNos` 로 만듭니다.
 *  · `spec[{ no, lower, upper }]` — **PASSED 포화값에서 되맞춘 한계**입니다. 확정된 항목만 옵니다.
 *    `limitBasis` 에 어떤 표본으로 되맞췄는지가 문장으로 옵니다 — 추정이라 화면에 그대로 밝힙니다.
 *  · `images[]` — NAS 사진. DIMENSION 에는 아직 연결이 없어 지금은 비어 옵니다.
 *
 * 한 시리얼의 SEQ 가 2,000~3,800개라 서버가 쪽 나눠 주고 기본은 **불량 SEQ 만** 옵니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadAoiDefect } from '../model/aoiDefectRepository';

export function useAoiDefectDetail(serialKey) {
  const toast = useUiStore((state) => state.toast);
  const { data, loading } = useAsync(() => loadAoiDefect(serialKey), [serialKey], { skip: !serialKey });
  // 앞 건의 응답이 남아 있는 동안 다른 시리얼의 값을 그리지 않도록 키를 맞춰 봅니다
  const detail = data && (!data.serialKey || data.serialKey === serialKey) ? data : null;

  const images = useMemo(
    () => (detail?.images || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
    [detail]
  );

  /** 되맞춘 한계 — `no → {lower, upper}`. 확정된 항목만 들어 있습니다 */
  const specByNo = useMemo(() => {
    const map = new Map();
    (detail?.spec || []).forEach((sp) => {
      if (sp?.no === null || sp?.no === undefined) return;
      map.set(Number(sp.no), { lower: sp.lower, upper: sp.upper, name: sp.name });
    });
    return map;
  }, [detail]);

  /**
   * 측정 표 — **한 줄 = 한 SEQ**, 치수는 가로로 폅니다.
   * SEQ 당 치수가 45~58개라 세로로 펴면 3,800 SEQ × 58 = 22만 줄이 됩니다. 가로가 맞습니다.
   *
   * 어느 치수가 걸렸는지는 두 갈래로 표시합니다.
   *  · `violFais` — 서버가 그 회차에서 한계를 벗어났다고 **지목한** 번호 (근거 있는 지목)
   *  · 한계 대조 — `spec` 이 있는 항목을 화면이 다시 재 봅니다 (서버가 지목을 못 준 경우의 보완)
   * 둘 다 없으면 값만 보여 줍니다 — 없는 근거를 지어내지 않습니다.
   */
  const { seqRows, valueCols } = useMemo(() => {
    const cols = new Map(); // key → title (열 순서를 응답 순서대로 지킵니다)
    const rows = [];

    (detail?.items || []).forEach((it) => {
      const viol = new Set((it.violFais || []).map((n) => `v${n}`));
      const row = {
        key: `s${it.seq}`,
        seq: it.seq,
        passed: it.passed,
        measuredAt: it.measuredAt || it.dateTime,
        cavity: it.cavity,
      };
      (it.measurements || []).forEach((m) => {
        if (m?.no === null || m?.no === undefined) return;
        const key = `v${m.no}`;
        if (!cols.has(key)) cols.set(key, `FAI${m.no}`);
        row[key] = m.value;

        // 서버가 지목하지 않았어도 한계를 벗어났으면 표시합니다
        const sp = specByNo.get(Number(m.no));
        const v = Number(m.value);
        if (sp && Number.isFinite(v)) {
          const low = sp.lower !== null && sp.lower !== undefined && v < Number(sp.lower);
          const high = sp.upper !== null && sp.upper !== undefined && v > Number(sp.upper);
          if (low || high) viol.add(key);
        }
      });
      row._viol = viol;
      rows.push(row);
    });

    // 서버가 쓰는 FAI 번호를 따로 주면(faiNos) 값이 비어 있는 열도 자리를 지킵니다
    (detail?.faiNos || []).forEach((no) => {
      const key = `v${no}`;
      if (!cols.has(key)) cols.set(key, `FAI${no}`);
    });

    return {
      seqRows: rows,
      valueCols: [...cols].map(([key, title]) => ({
        key,
        title,
        spec: specByNo.get(Number(key.slice(1))) || null,
      })),
    };
  }, [detail, specByNo]);

  /** 확대해서 보는 사진 — 상세가 바뀌면 첫 장으로 */
  const [activeSeq, setActiveSeq] = useState(null);
  useEffect(() => {
    setActiveSeq(images[0]?.seq ?? null);
  }, [images]);
  const activeImage = images.find((img) => img.seq === activeSeq) || images[0] || null;
  const activeIndex = activeImage ? images.indexOf(activeImage) : -1;

  const showImage = useCallback((seq) => setActiveSeq(seq), []);
  const stepImage = useCallback((delta) => {
    if (!images.length) return;
    const next = (activeIndex + delta + images.length) % images.length;
    setActiveSeq(images[next].seq);
  }, [images, activeIndex]);

  /** NAS 경로 복사 — 웹 클립보드. 안 되는 환경(http · 권한 없음)이면 안내합니다 */
  const copyPath = useCallback(async (path) => {
    if (!path) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(path);
        toast('NAS 경로를 복사했습니다');
        return;
      }
      throw new Error('clipboard unavailable');
    } catch {
      toast('이 브라우저에서는 자동 복사가 되지 않습니다 — 경로를 직접 선택해 복사해 주세요');
    }
  }, [toast]);

  return { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, seqRows, valueCols, specByNo };
}
