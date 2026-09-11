/**
 * [Controller] AOI 불량 한 건 상세 — 모달 안에서만 씁니다 (REQ_20260911 F-7)
 *
 * 목록에서 행을 누르면 화면이 모달을 열고, 모달 컴포넌트가 이 훅으로 상세를 직접 받습니다.
 * (모달 내용은 전역 모달 스토어의 render 로 그려지므로, 바깥 컨트롤러 상태로는 다시 그려지지 않습니다.)
 *
 * 상세 응답 — MSSQL 실측(docs/requests/REQ_20260911_aoi_dimension_mssql_실측.md)에 맞춰 두 모양을 함께 읽습니다
 *  · 판정 정보(설비·LOT·시리얼·수량·등급 …)
 *  · **DIMENSION**: `items[{ seq, passed, measuredAt, measurements[{no,value}] }]` + `faiNos[]`
 *    한 행(SEQ)이 치수 45~58개를 통째로 갖습니다 — SEQ 는 검사 항목 번호가 아니라 **제품 1개의 측정 회차**입니다.
 *    쓰는 FAI 개수는 작업장마다 다릅니다(S110 45개 · S120 58개). 그래서 열은 응답이 준 번호로 만듭니다.
 *  · **기존(MES)**: `measurements[{ seq, passed, dateTime, comment, values[{name,value}] }]`
 *  · `images[{imageId,seq,nasPath,capturedAt,sizeBytes,available,url,thumbUrl}]` — NAS 사진(서명 주소 15분).
 *
 * 한 시리얼의 SEQ 는 2,000~3,800개라 서버가 쪽 나눠 주고 기본은 **불량 SEQ 만** 옵니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadAoiDefect } from '../model/aoiDefectRepository';

export function useAoiDefectDetail(defectId) {
  const toast = useUiStore((state) => state.toast);
  const { data, loading } = useAsync(() => loadAoiDefect(defectId), [defectId], { skip: !defectId });
  const detail = data && data.defectId === defectId ? data : null;

  const images = useMemo(
    () => (detail?.images || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
    [detail]
  );

  /**
   * 측정 표 — **한 줄 = 한 SEQ**, 치수는 가로로 폅니다.
   * SEQ 당 치수가 45~58개라 세로로 펴면 3,800 SEQ × 58 = 22만 줄이 됩니다. 가로가 맞습니다.
   */
  const { seqRows, valueCols } = useMemo(() => {
    const cols = new Map(); // key → title (열 순서를 응답 순서대로 지킵니다)
    const rows = [];

    /** DIMENSION — items[{seq,passed,measuredAt,measurements[{no,value}]}] */
    (detail?.items || []).forEach((it) => {
      const row = { key: `s${it.seq}`, seq: it.seq, passed: it.passed, measuredAt: it.measuredAt || it.dateTime };
      (it.measurements || []).forEach((m) => {
        if (m?.no === null || m?.no === undefined) return;
        const key = `v${m.no}`;
        if (!cols.has(key)) cols.set(key, `FAI${m.no}`);
        row[key] = m.value;
      });
      rows.push(row);
    });

    /** 기존(MES) — measurements[{seq,passed,dateTime,comment,values[{name,value}]}] */
    (detail?.measurements || []).forEach((m) => {
      const row = { key: `m${m.seq}`, seq: m.seq, passed: m.passed, measuredAt: m.dateTime, comment: m.comment };
      (m.values || []).forEach((v, i) => {
        if (!v || v.value === null || v.value === undefined || v.value === '') return;
        const key = `v${v.name ?? i}`;
        if (!cols.has(key)) cols.set(key, String(v.name ?? `값${i + 1}`));
        row[key] = v.value;
      });
      rows.push(row);
    });

    // 서버가 쓰는 FAI 번호를 따로 주면(faiNos) 값이 비어 있는 열도 자리를 지킵니다
    (detail?.faiNos || []).forEach((no) => {
      const key = `v${no}`;
      if (!cols.has(key)) cols.set(key, `FAI${no}`);
    });

    return { seqRows: rows, valueCols: [...cols].map(([key, title]) => ({ key, title })) };
  }, [detail]);

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

  return { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, seqRows, valueCols };
}
