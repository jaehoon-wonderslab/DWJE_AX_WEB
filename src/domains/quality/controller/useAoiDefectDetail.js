/**
 * [Controller] AOI 불량 한 건 상세 — 모달 안에서만 씁니다 (REQ_20260911 F-7)
 *
 * 목록에서 행을 누르면 화면이 모달을 열고, 모달 컴포넌트가 이 훅으로 상세를 직접 받습니다.
 * (모달 내용은 전역 모달 스토어의 render 로 그려지므로, 바깥 컨트롤러 상태로는 다시 그려지지 않습니다.)
 *
 * 상세 응답
 *  · 판정 정보(설비·LOT·시리얼·수량·등급 …)
 *  · `measurements[{ seq, passed, dateTime, comment, values[{name,value}] }]` — DIMENSION 검사 항목(SEQ 당 1종류).
 *    MSSQL 원천이 붙기 전(MES 라벨 이력)에는 비어 옵니다 — 그때는 검사 항목 표를 그리지 않습니다.
 *  · `images[{imageId,seq,nasPath,capturedAt,sizeBytes,available,url,thumbUrl}]` — NAS 사진(서명 주소 15분).
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

  /** 검사 항목 표 — SEQ × 측정값을 한 줄로 펼칩니다 (SEQ 당 값이 여러 개면 줄이 늘어납니다) */
  const measurementRows = useMemo(() => {
    const out = [];
    (detail?.measurements || []).forEach((m) => {
      const values = (m.values || []).filter((v) => v && v.value !== null && v.value !== undefined && v.value !== '');
      if (!values.length) {
        out.push({ key: `${m.seq}`, seq: m.seq, passed: m.passed, name: null, value: null, dateTime: m.dateTime, comment: m.comment });
        return;
      }
      values.forEach((v, i) => {
        out.push({ key: `${m.seq}-${v.name}-${i}`, seq: m.seq, passed: m.passed, name: v.name, value: v.value, dateTime: m.dateTime, comment: m.comment });
      });
    });
    return out;
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

  return { detail, loading, images, activeImage, activeIndex, showImage, stepImage, copyPath, measurementRows };
}
