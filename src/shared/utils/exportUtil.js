/**
 * 내려받기 · 인쇄 유틸 (CM-07)
 *
 * 엑셀(.xls) · CSV · 인쇄/PDF 3종 출력을 담당합니다.
 * 모든 출력은 보고서 다운로드 이력(SY-14)에 자동 기록되며, 비공개(blind) 항목은 제외됩니다.
 *
 * 웹에서만 실제 파일이 만들어지고, 앱(네이티브)에서는 안내 토스트만 띄웁니다.
 */
import { Platform } from 'react-native';
import { toast } from '@shared/stores/useUiStore';
import { API_BASE_URL } from '@services/api/client';
import * as systemService from '@services/api/systemService';
import { useAuthStore } from '@shared/stores/useAuthStore';

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

/** 값 하나를 CSV 셀로 감쌉니다 */
function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/**
 * 브라우저에서 파일을 내려받습니다.
 *
 * @param {Blob} blob 파일 내용
 * @param {string} filename 저장 파일명 (확장자 포함)
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * 다운로드 이력을 서버에 기록합니다. (SY-14)
 *
 * 서버가 받는 키는 `reportNm` · `rowCnt` · `blindCnt` 입니다.
 * 예전에는 `reportName` · `rowCount` · `blindCount` 로 보내서 **이름과 건수가 버려진 채**
 * 기록되고 있었습니다. 실패를 `.catch(() => {})` 로 삼키고 있어 아무도 몰랐습니다.
 * 호출부 시그니처는 그대로 두고 여기서만 서버 이름으로 바꿉니다.
 *
 * @param {object} log { reportName, format, rowCount, blindCount, menuId }
 */
function logDownload({ reportName, format, rowCount, blindCount, menuId }) {
  // 이력 기록은 부가 동작이라 사용자 흐름을 막지 않습니다.
  // 다만 조용히 삼키지는 않습니다 — 그래서 이 버그를 오래 못 봤습니다.
  systemService
    .postDownloadLogs({ reportNm: reportName, format, rowCnt: rowCount, blindCnt: blindCount, menuId })
    .then((res) => {
      if (!res?.success) console.warn('[내려받기 이력] 기록 실패:', res?.message, res?.error?.field || '');
    })
    .catch((e) => console.warn('[내려받기 이력] 기록 실패:', e?.message));
}

/**
 * 서버가 만든 파일을 그대로 내려받습니다.
 *
 * 화면에서 표를 조립해 만드는 `downloadXls` 와 달리, **쪽에 걸리지 않은 전량**을 서버가 뽑아 줍니다.
 * 내려받기 이력(SY-14)도 서버가 직접 남기므로 여기서 `logDownload` 를 부르지 않습니다
 * (부르면 한 번의 내려받기가 이력에 두 줄로 남습니다).
 *
 * @param {object} config
 *   path   `/api/v1` 뒤의 경로 (예: '/production/results/export')
 *   body   요청 본문
 *   name   실패 안내에 쓸 이름
 * @returns {Promise<boolean>} 성공 여부
 */
export async function downloadFromServer({ path, body = {}, name = '파일' }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return false;
  }
  try {
    const { accessToken } = useAuthStore.getState();
    const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // 서버가 오류를 JSON 으로 주면 그 문구를 그대로 보여 줍니다
      const msg = await res.json().then((j) => j?.message).catch(() => null);
      toast(msg || `${name}을(를) 내려받지 못했습니다 (HTTP ${res.status})`);
      return false;
    }
    saveBlob(await res.blob(), filenameOf(res) || `${name}.xlsx`);
    toast(`${name}을(를) 내려받았습니다`);
    return true;
  } catch (e) {
    toast(e?.message || `${name}을(를) 내려받지 못했습니다`);
    return false;
  }
}

/** Content-Disposition 에서 서버가 정한 파일명을 꺼냅니다 (RFC 5987 우선) */
function filenameOf(res) {
  const cd = res.headers.get('content-disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1]);
  const plain = cd.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

/**
 * 표 데이터를 CSV 로 내려받습니다.
 *
 * @param {object} config { name, head:string[], rows:(string|number)[][], blindCount }
 */
export function downloadCsv({ name, head, rows, blindCount = 0 }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return;
  }
  if (!rows?.length) {
    toast('내려받을 표를 찾을 수 없습니다');
    return;
  }
  const lines = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  // BOM(﻿) 을 붙여야 엑셀에서 한글이 깨지지 않습니다
  saveBlob(new Blob([`﻿${lines}`], { type: 'text/csv;charset=utf-8;' }), `${name}.csv`);
  logDownload({ reportName: name, format: 'CSV (.csv)', rowCount: rows.length, blindCount });
  toast(`${name}.csv 파일을 내려받았습니다${blindCount ? ` — 비공개 ${blindCount}건은 제외됨` : ' (비공개 항목 제외)'}`);
}

/**
 * 표 데이터를 엑셀(.xls) 로 내려받습니다.
 * (SpreadsheetML 대신 엑셀이 읽을 수 있는 HTML 표 형식을 씁니다 — 별도 라이브러리 불필요)
 *
 * @param {object} config { name, head, rows, blindCount }
 */
export function downloadXls({ name, head, rows, blindCount = 0 }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return;
  }
  if (!rows?.length) {
    toast('내려받을 표를 찾을 수 없습니다');
    return;
  }
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html =
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>` +
    `<table border="1"><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>` +
    rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') +
    `</table></body></html>`;
  saveBlob(new Blob([`﻿${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${name}.xls`);
  logDownload({ reportName: name, format: '엑셀 (.xls)', rowCount: rows.length, blindCount });
  toast(`${name}.xls 파일을 내려받았습니다${blindCount ? ` — 비공개 ${blindCount}건은 제외됨` : ''}`);
}

/**
 * 표를 진짜 엑셀(.xlsx) 파일로 내려받습니다.
 *
 * `downloadXls` 는 HTML 표에 `.xls` 확장자를 붙이는 방식이라 엑셀이 열 때 경고를 냅니다.
 * 사람이 받아 바로 쓰는 리포트는 이쪽을 씁니다.
 *
 * 행은 `{ cells, style }` 로 줍니다.
 *   `title`   보고서 제목 줄
 *   `meta`    기준일·모델 같은 머리 정보
 *   `section` 절 제목
 *   `head`    표 머리글
 *   기본       본문
 *
 * @param {object} config { name, sheetName, columns[{header,width}], rows, blindCount }
 */
export async function downloadXlsx({ name, sheetName = 'Sheet1', columns = [], rows = [], blindCount = 0 }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return;
  }
  if (!rows?.length) {
    toast('내려받을 내용이 없습니다');
    return;
  }

  try {
    const ExcelJS = await import('exceljs').then((m) => m.default || m);
    const wb = new ExcelJS.Workbook();
    wb.creator = '덕우전자 AX 시스템';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    if (columns.length) ws.columns = columns.map((c) => ({ width: c.width || 18 }));

    rows.forEach((r) => {
      const row = ws.addRow(r.cells || r);
      const style = r.style;
      row.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' };

      if (style === 'title') {
        row.font = { bold: true, size: 15 };
        row.height = 26;
      } else if (style === 'meta') {
        row.font = { size: 10, color: { argb: 'FF666666' } };
      } else if (style === 'section') {
        row.font = { bold: true, size: 12 };
        row.height = 22;
      } else if (style === 'head') {
        row.font = { bold: true, size: 10.5 };
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F8' } };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBC4D0' } } };
        });
      } else if (style === 'quote') {
        row.font = { size: 10, italic: true, color: { argb: 'FF555555' } };
      } else {
        row.font = { size: 10.5 };
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    saveBlob(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${name}.xlsx`
    );
    logDownload({ reportName: name, format: '엑셀 (.xlsx)', rowCount: rows.length, blindCount });
    toast(`${name}.xlsx 파일을 내려받았습니다${blindCount ? ` — 비공개 ${blindCount}건은 제외됨` : ''}`);
  } catch (e) {
    console.error('[엑셀 내려받기] 실패:', e);
    toast('엑셀 파일을 만들지 못했습니다');
  }
}

/**
 * 보고서 영역을 인쇄(또는 PDF 저장)합니다.
 *
 * React Native for Web 에서는 DOM 노드를 직접 다루지 않고,
 * 인쇄할 영역에 nativeID 를 지정해 두고 그 id 로 찾아 새 창에 복사합니다.
 *
 * @param {object} config { nodeId, title, role }
 */
export function printDocument({ nodeId, title, role }) {
  if (!isWeb) {
    toast('앱에서는 인쇄를 지원하지 않습니다 — 웹에서 이용하세요');
    return;
  }
  const node = document.getElementById(nodeId);
  if (!node) {
    toast('인쇄할 보고서 영역을 찾을 수 없습니다');
    return;
  }
  const win = window.open('', '_blank', 'width=1180,height=860');
  if (!win) {
    toast('팝업이 차단되어 인쇄 창을 열 수 없습니다');
    return;
  }
  // 현재 문서의 스타일을 그대로 복사해야 표 서식이 유지됩니다
  const css = Array.from(document.querySelectorAll('style')).map((x) => x.outerHTML).join('');
  const stamp = new Date().toISOString().slice(0, 10);
  win.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title>${css}` +
      `<style>body{background:#fff;padding:16px;color:#0b0d10}@page{size:A4 landscape;margin:9mm}` +
      `.no-print{display:none!important}</style></head><body>${node.outerHTML}` +
      `<div style="margin-top:14px;font-size:10.5px;color:#6b7280">덕우전자 AX — ${title} · 출력 ${stamp} · 열람 계정 ${role || ''}</div>` +
      `</body></html>`
  );
  win.document.close();
  const blindCount = node.querySelectorAll('[data-blind="1"]').length;
  logDownload({ reportName: title, format: '인쇄 · PDF', rowCount: 0, blindCount });
  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

/**
 * 계층 트리 데이터(일자 ➔ 제품 ➔ 공정/프레스 기기)를 엑셀 그룹핑(+/- 아웃라인)이 적용된
 * 순수 .xlsx 파일로 내려받습니다.
 *
 * @param {object} config { name, head, rows, blindCount }
 */
export async function downloadXlsxTree({ name, head, rows, blindCount = 0 }) {
  if (!isWeb) {
    toast('앱에서는 파일 내려받기를 지원하지 않습니다 — 웹에서 이용하세요');
    return;
  }
  if (!rows?.length) {
    toast('내려받을 데이터가 없습니다');
    return;
  }

  try {
    const ExcelJS = await import('exceljs').then((m) => m.default || m);
    const wb = new ExcelJS.Workbook();
    wb.creator = '덕우전자 AX 시스템';
    wb.lastModifiedBy = '덕우전자 AX 시스템';
    wb.created = new Date();

    const ws = wb.addWorksheet('생산실적집계', {
      views: [{ showGridLines: true }],
      properties: {
        outlineProperties: {
          summaryBelow: false,
          summaryRight: false,
        },
      },
    });

    // 컬럼 정의 (사용자 후처리 편집 및 피벗 분석이 용이하도록 개별 셀로 완전 분리)
    ws.columns = [
      { header: '일자', key: 'period', width: 14 },
      { header: '제품명', key: 'product', width: 18 },
      { header: '공장', key: 'plant', width: 13 },
      { header: '공정', key: 'process', width: 14 },
      { header: '설비(기기)', key: 'equipment', width: 26 },
      { header: '투입 수량', key: 'inputQty', width: 16 },
      { header: '양품 수량', key: 'okQty', width: 16 },
      { header: '불량 수량', key: 'ngQty', width: 16 },
      { header: '불량률', key: 'defectRate', width: 13 },
      { header: '가동률', key: 'uptimeRate', width: 13 },
      { header: '비가동 시간', key: 'downtimeMin', width: 15 },
    ];

    // 헤더 스타일링 (Shadcn 깔끔한 테마)
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Pretendard', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
    };

    const numFmt = (v) => (v != null && typeof v === 'number' ? v : v ?? '—');
    const pctFmt = (v) => (v != null && v !== '' ? (typeof v === 'number' ? `${v.toFixed(1)}%` : `${v}%`) : '—');

    let totalExportedRows = 0;

    // 1depth (일자) ➔ 2depth (제품) ➔ 3depth (공장/공정/설비) 순회
    rows.forEach((r1) => {
      totalExportedRows++;
      // Depth 1 (일자 요약 행)
      const row1 = ws.addRow({
        period: r1.period,
        product: '전체 (일자 합계)',
        plant: '—',
        process: '—',
        equipment: '—',
        inputQty: numFmt(r1.inputQty),
        okQty: numFmt(r1.okQty),
        ngQty: numFmt(r1.ngQty),
        defectRate: pctFmt(r1.defectRate),
        uptimeRate: pctFmt(r1.uptimeRate),
        downtimeMin: r1.downtimeMin != null ? `${r1.downtimeMin}분` : '—',
      });
      row1.height = 25;
      row1.font = { name: 'Pretendard', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      row1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
      row1.outlineLevel = 0;
      row1.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = borderStyle;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber <= 4 ? 'center' : colNumber === 5 ? 'left' : 'right',
        };
        if (colNumber >= 6 && colNumber <= 8 && typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });

      if (Array.isArray(r1._children) && r1._children.length > 0) {
        r1._children.forEach((r2) => {
          totalExportedRows++;
          // Depth 2 (제품 소계 행)
          const row2 = ws.addRow({
            period: r1.period,
            product: r2.period,
            plant: '—',
            process: '—',
            equipment: '제품 소계',
            inputQty: numFmt(r2.inputQty),
            okQty: numFmt(r2.okQty),
            ngQty: numFmt(r2.ngQty),
            defectRate: pctFmt(r2.defectRate),
            uptimeRate: '—',
            downtimeMin: '—',
          });
          row2.height = 23;
          row2.font = { name: 'Pretendard', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
          row2.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F7FF' },
          };
          row2.outlineLevel = 1; // 엑셀 그룹 1레벨
          row2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = borderStyle;
            cell.alignment = {
              vertical: 'middle',
              horizontal: colNumber <= 4 ? 'center' : colNumber === 5 ? 'left' : 'right',
            };
            if (colNumber >= 6 && colNumber <= 8 && typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
            }
          });

          if (Array.isArray(r2._children) && r2._children.length > 0) {
            r2._children.forEach((r3) => {
              totalExportedRows++;
              // Depth 3 (세부 공장/공정/설비 행)
              const row3 = ws.addRow({
                period: r1.period,
                product: r2.period,
                plant: r3.plantNm || '제1공장',
                process: r3.processNm || '공정',
                equipment: r3.period, // 예: MT-004 (프레스 04호기)
                inputQty: numFmt(r3.inputQty),
                okQty: numFmt(r3.okQty),
                ngQty: numFmt(r3.ngQty),
                defectRate: pctFmt(r3.defectRate),
                uptimeRate: '—',
                downtimeMin: '—',
              });
              row3.height = 22;
              row3.font = { name: 'Pretendard', size: 9.5, color: { argb: 'FF334155' } };
              row3.outlineLevel = 2; // 엑셀 그룹 2레벨
              row3.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = borderStyle;
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: colNumber <= 4 ? 'center' : colNumber === 5 ? 'left' : 'right',
                };
                if (colNumber >= 6 && colNumber <= 8 && typeof cell.value === 'number') {
                  cell.numFmt = '#,##0';
                }
              });
            });
          }
        });
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveBlob(blob, `${name}.xlsx`);
    logDownload({ reportName: name, format: '엑셀 (.xlsx)', rowCount: totalExportedRows, blindCount });
    toast(`${name}.xlsx 파일을 내려받았습니다. (엑셀 좌측 +/- 그룹핑 지원)`);
  } catch (err) {
    console.error('XLSX 다운로드 오류:', err);
    toast('엑셀 파일 생성 중 오류가 발생했습니다.');
  }
}

/**
 * D3 SVG 차트를 고해상도 PNG 이미지로 변환하여 다운로드합니다.
 */
/**
 * D3 SVG 차트를 고해상도 PNG 이미지로 변환하여 다운로드합니다.
 * svgId 또는 containerId를 받아 단일/복수 SVG 차트를 모두 완벽하게 캡처합니다.
 */
export async function saveChartAsPng({
  svgId,
  containerId,
  fileName = '차트',
  title = '',
  sub = '',
  isDark = false,
  showLegend = false,
} = {}) {
  try {
    if (typeof document === 'undefined') return;

    let svgs = [];
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        svgs = Array.from(container.querySelectorAll('svg'));
      }
    } else if (svgId) {
      const el = document.getElementById(svgId);
      if (el) svgs = [el];
    }

    if (!svgs.length) {
      toast('저장할 차트 요소를 찾을 수 없습니다.');
      return;
    }

    // 각 SVG를 Image 객체로 비동기 변환
    const URL = window.URL || window.webkitURL || window;
    const items = await Promise.all(
      svgs.map((svg) => {
        return new Promise((resolve, reject) => {
          const clone = svg.cloneNode(true);
          const w = parseInt(svg.getAttribute('width'), 10) || svg.clientWidth || 600;
          const h = parseInt(svg.getAttribute('height'), 10) || svg.clientHeight || 200;

          const svgString = new XMLSerializer().serializeToString(clone);
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const blobURL = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.onload = () => resolve({ img, w, h, blobURL });
          img.onerror = () => {
            URL.revokeObjectURL(blobURL);
            reject(new Error('SVG 이미지 로드 실패'));
          };
          img.src = blobURL;
        });
      })
    );

    const maxW = Math.max(...items.map((it) => it.w), 500);
    const topPadding = title ? 48 : 20;
    const bottomPadding = showLegend ? 44 : 20;
    const gap = 14;
    const totalSvgH = items.reduce((acc, it) => acc + it.h, 0) + (items.length - 1) * gap;

    const canvasWidth = Math.max(maxW + 40, 600);
    const canvasHeight = topPadding + totalSvgH + bottomPadding;

    const canvas = document.createElement('canvas');
    const scale = 2; // Retina 고해상도 2배수
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 배경 채우기
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 타이틀
    if (title) {
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
      ctx.fillText(title, 20, 30);

      if (sub) {
        const titleWidth = ctx.measureText(title).width;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = 'normal 12px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
        ctx.fillText(sub, 20 + titleWidth + 12, 30);
      }
    }

    // SVG 차트들 세로로 그리기
    let curY = topPadding;
    items.forEach((it) => {
      ctx.drawImage(it.img, 20, curY, it.w, it.h);
      URL.revokeObjectURL(it.blobURL);
      curY += it.h + gap;
    });

    // 선택적 범례 (생산량/불량률)
    if (showLegend) {
      const legendY = curY + 6;
      const centerX = canvasWidth / 2;

      // 범례 1: 생산량
      ctx.fillStyle = isDark ? '#3b82f6' : '#2563eb';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(centerX - 130, legendY - 8, 12, 10, 2);
      } else {
        ctx.fillRect(centerX - 130, legendY - 8, 12, 10);
      }
      ctx.fill();

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = '11.5px -apple-system, BlinkMacSystemFont, Pretendard, sans-serif';
      ctx.fillText('생산량 (좌측 축)', centerX - 112, legendY);

      // 범례 2: 불량률 %
      ctx.fillStyle = isDark ? '#fb923c' : '#ea580c';
      ctx.fillRect(centerX + 30, legendY - 4, 14, 3);

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.fillText('불량률 % (우측 축)', centerX + 50, legendY);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      saveBlob(blob, `${fileName}.png`);
      toast(`${fileName}.png 차트 이미지를 저장했습니다.`);
    }, 'image/png');
  } catch (err) {
    console.error('차트 이미지 저장 오류:', err);
    toast('차트 이미지 저장 중 오류가 발생했습니다.');
  }
}

