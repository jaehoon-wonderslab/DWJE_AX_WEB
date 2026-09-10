/**
 * [Controller] DB-01 업로드 리포트 탭
 *
 * 문서 선택 → 버전 선택 → 파싱 데이터(블록) 를 순서대로 가져오고,
 * `dash-ai-upload` 동작 권한이 있는 계정에게만 업로드 흐름(파일 선택 → 제목·메모 → 업로드 → 결과)을 열어 줍니다.
 *
 * 업로드는 웹 전용입니다 — 숨은 <input type="file"> 을 만들어 고르게 하고 File 객체를 그대로 서비스로 넘깁니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { Button, FormAlert, openFormModal } from '@shared/components/ui';
import React from 'react';
import { Text, View } from 'react-native';
import { printDocument } from '@shared/utils/exportUtil';
import * as repo from '../model/uploadReportRepository';
import { docOptionLabel, formatBytes, versionOptionLabel } from '../model/uploadReportModel';

/** 업로드 상한 (요청 B3 — 20MB · xlsx 만) */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** 엑셀 포맷 규칙 안내 (API 회신 2026-09-10 확정 — 시트명에 `[ ]` 는 엑셀이 허용하지 않아 `#` 접미어) */
export const FORMAT_RULE = '엑셀 규칙 — 시트 1행은 헤더, 1열은 X축, 나머지 숫자 열이 시리즈입니다. 시트명 끝에 #line · #bar · #grouped · #donut · #table 을 붙여 차트 종류를 정하고(예: 월별 불량률 #line), 접미어가 없으면 시리즈 1개 → 막대, 여러 개 → 선, 숫자 열 없음 → 표로 자동 판정합니다. 시트명은 31자까지, 파일은 xlsx · 20MB 이하.';

/** 인쇄 영역 id — 뷰의 본문 카드 묶음에 nativeID 로 붙습니다 */
export const PRINT_NODE_ID = 'upload-report-print';

/**
 * 브라우저 파일 선택 창을 열고 고른 파일을 돌려줍니다. 취소하면 null.
 * (취소는 change 가 오지 않으므로 창이 다시 포커스를 받은 뒤 잠깐 기다려 판정합니다)
 */
function pickXlsxFile() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';
    let done = false;
    const finish = (file) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(file || null);
    };
    const onFocus = () => setTimeout(() => finish(input.files?.[0] || null), 400);
    input.addEventListener('change', () => finish(input.files?.[0] || null));
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}

/** 업로드 직후 파싱 결과 — 서버가 준 경고 문장을 그대로 보여 줍니다 */
function showParseResult(data) {
  const fail = data.parseState === 'FAIL';
  useUiStore.getState().openModal({
    title: fail ? '파싱 실패 — 저장은 되었습니다' : `파싱 경고 ${data.warnings.length}건`,
    sub: `${data.title || ''} · v${data.version} · ${data.fileName || ''}`,
    render: () => (
      <View style={{ gap: 8 }}>
        {fail ? <FormAlert>읽을 수 있는 시트가 없어 차트·표를 만들지 못했습니다. 파일은 버전으로 남았으니 포맷을 고쳐 새 버전으로 다시 올려 주세요.</FormAlert> : null}
        {data.warnings.map((w, i) => (
          <FormAlert key={i} tone={fail ? 'error' : 'info'}>{typeof w === 'string' ? w : w?.message || JSON.stringify(w)}</FormAlert>
        ))}
        <Text style={{ fontSize: 16, lineHeight: 18, color: '#787878' }}>{FORMAT_RULE}</Text>
      </View>
    ),
    footer: (close) => <Button label="확인" variant="primary" onPress={close} />,
  });
}

/** 파일이 규칙에 맞는지 — 확장자 · 크기 */
function fileError(file) {
  if (!file) return '파일을 선택하지 않았습니다';
  if (!/\.xlsx$/i.test(file.name || '')) return 'xlsx 파일만 업로드할 수 있습니다';
  if (file.size > MAX_UPLOAD_BYTES) return `파일이 너무 큽니다 (${formatBytes(file.size)}) — 20MB 이하만 올릴 수 있습니다`;
  return '';
}

export function useUploadReportController() {
  const toast = useUiStore((state) => state.toast);
  const can = useAuthStore((state) => state.can);
  const role = useAuthStore((state) => state.userInfo?.dept);
  const canUpload = can('dash-ai-upload');

  const [docId, setDocId] = useState('');
  const [version, setVersion] = useState(null);
  const [uploading, setUploading] = useState(false);
  /** 문서 목록을 다시 받은 뒤 이 문서·버전을 골라 두라는 예약 (업로드 직후) */
  const pendingSelect = useRef(null);
  /** 업로드 응답에 파싱 결과가 함께 오므로, 그 문서·버전을 고를 때 다시 조회하지 않고 여기서 꺼냅니다 */
  const preloaded = useRef(null);

  // 1) 문서 목록
  const docsQuery = useAsync(() => repo.loadUploadDocs(), [], { initialData: [] });
  const docs = docsQuery.data || [];

  // 목록이 오면: 예약된 문서가 있으면 그것, 없으면 첫(최근) 문서
  useEffect(() => {
    if (docsQuery.loading) return;
    if (pendingSelect.current) {
      const { docId: d, version: v } = pendingSelect.current;
      pendingSelect.current = null;
      setDocId(d);
      setVersion(v);
      return;
    }
    if (!docId && docs.length) {
      setDocId(docs[0].docId);
      setVersion(docs[0].latestVersion || null);
    } else if (docId && !docs.some((d) => d.docId === docId)) {
      setDocId(docs[0]?.docId || '');
      setVersion(docs[0]?.latestVersion || null);
    }
  }, [docsQuery.loading, docs, docId]);

  const doc = useMemo(() => docs.find((d) => d.docId === docId) || null, [docs, docId]);

  // 2) 버전 이력 — 문서가 바뀌면 다시
  // 응답에 어느 문서의 이력인지 함께 담아, 문서를 바꾼 직후 이전 문서의 이력을 새 문서 것으로 읽지 않게 합니다
  const versionsQuery = useAsync(async () => ({ docId, items: await repo.loadUploadVersions(docId) }), [docId], { skip: !docId, silent: true });
  const versions = useMemo(() => (versionsQuery.data?.docId === docId ? versionsQuery.data.items : []), [versionsQuery.data, docId]);

  // 버전 목록이 왔는데 고른 버전이 없거나 목록에 없으면 최신으로
  useEffect(() => {
    if (!docId || versionsQuery.loading || !versions.length) return;
    if (version === null || !versions.some((v) => Number(v.version) === Number(version))) {
      setVersion(Number(versions[0].version));
    }
  }, [docId, version, versions, versionsQuery.loading]);

  const versionInfo = useMemo(() => versions.find((v) => Number(v.version) === Number(version)) || null, [versions, version]);

  // 3) 파싱 데이터 — 문서·버전이 정해지면
  const dataKey = docId && version ? `${docId}:${version}` : '';
  const dataQuery = useAsync(async () => {
    if (preloaded.current?.key === dataKey) {
      const { report } = preloaded.current;
      preloaded.current = null;
      return { key: dataKey, report };
    }
    return { key: dataKey, report: await repo.loadUploadData(docId, version) };
  }, [dataKey], { skip: !dataKey, silent: true });
  const report = dataKey && dataQuery.data?.key === dataKey ? dataQuery.data.report : null;

  const selectDoc = useCallback((next) => {
    if (next === docId) return;
    setDocId(next);
    // 버전은 새 문서의 최신으로 — 이력이 오면 위 effect 가 맞춥니다
    const d = docs.find((x) => x.docId === next);
    setVersion(d?.latestVersion || null);
  }, [docId, docs]);

  const selectVersion = useCallback((v) => setVersion(v === '' || v === null || v === undefined ? null : Number(v)), []);

  /**
   * 업로드 결과를 화면에 반영 — 응답(파싱 결과 포함)을 그대로 보관해 두고 목록을 다시 받은 뒤 그 문서·버전을 고릅니다.
   * 경고는 서버 문장을 그대로 모달에 보여 줍니다 (FAIL 이면 저장은 됐지만 그릴 시트가 없다는 뜻).
   */
  const applyUploaded = useCallback(async (res) => {
    if (!res.ok || !res.data) {
      toast(res.message || '업로드하지 못했습니다');
      return;
    }
    const data = res.data;
    toast(res.message || `v${data.version} 을 업로드했습니다`);
    if (data.warnings.length || data.parseState === 'FAIL') showParseResult(data);
    preloaded.current = { key: `${data.docId}:${data.version}`, report: data };
    pendingSelect.current = { docId: data.docId, version: Number(data.version) };
    await docsQuery.reload();
  }, [toast, docsQuery]);

  /**
   * 새 문서 업로드 — 파일 선택 → 제목·메모 폼 → 업로드
   * 권한이 없으면 버튼이 보이지 않지만, 혹시 호출되면 한 번 더 막습니다.
   */
  const uploadNew = useCallback(async () => {
    if (!canUpload) { toast('업로드 권한이 없습니다 — 시스템관리 > 메뉴 접근 권한에서 지정합니다'); return; }
    if (Platform.OS !== 'web') { toast('엑셀 업로드는 웹에서 이용하세요'); return; }
    const file = await pickXlsxFile();
    if (!file) return;
    const err = fileError(file);
    if (err) { toast(err); return; }
    const defaultTitle = String(file.name).replace(/\.xlsx$/i, '');
    openFormModal({
      title: '엑셀 업로드 — 새 문서',
      sub: `${file.name} · ${formatBytes(file.size)}`,
      fields: [
        { key: 'file', label: '파일', type: 'static', value: `${file.name} (${formatBytes(file.size)})`, full: true },
        { key: 'title', label: '제목', required: true, value: defaultTitle, placeholder: '회의 이름 · 자료 이름', full: true },
        { key: 'memo', label: '메모', type: 'textarea', placeholder: '어떤 자료인지 · 기준 기간 · 출처 등', full: true },
      ],
      note: `${FORMAT_RULE} 파일은 서버에 저장되고 버전으로 관리됩니다.`,
      submitLabel: '업로드',
      onSubmit: async (values) => {
        setUploading(true);
        try {
          const res = await repo.uploadNewDoc({ file, title: values.title.trim(), memo: values.memo || '' });
          await applyUploaded(res);
          return res.ok ? undefined : false;
        } finally {
          setUploading(false);
        }
      },
    });
  }, [canUpload, toast, applyUploaded]);

  /** 선택한 문서에 새 버전 업로드 — 파일 선택 → 메모 → 업로드 */
  const uploadVersion = useCallback(async () => {
    if (!canUpload) { toast('업로드 권한이 없습니다 — 시스템관리 > 메뉴 접근 권한에서 지정합니다'); return; }
    if (!doc) { toast('먼저 문서를 선택하세요'); return; }
    if (Platform.OS !== 'web') { toast('엑셀 업로드는 웹에서 이용하세요'); return; }
    const file = await pickXlsxFile();
    if (!file) return;
    const err = fileError(file);
    if (err) { toast(err); return; }
    openFormModal({
      title: '새 버전 업로드',
      sub: `${doc.title} · 현재 v${doc.latestVersion || 0} → v${(doc.latestVersion || 0) + 1}`,
      fields: [
        { key: 'doc', label: '문서', type: 'static', value: doc.title, full: true },
        { key: 'file', label: '파일', type: 'static', value: `${file.name} (${formatBytes(file.size)})`, full: true },
        { key: 'memo', label: '변경 메모', type: 'textarea', placeholder: '무엇이 바뀌었는지 (예: 8/31 실적 추가)', full: true },
      ],
      note: '이전 버전은 그대로 남고, 버전 드롭다운에서 언제든 다시 볼 수 있습니다.',
      submitLabel: '업로드',
      onSubmit: async (values) => {
        setUploading(true);
        try {
          const res = await repo.uploadNewVersion({ docId: doc.docId, file, memo: values.memo || '' });
          await applyUploaded(res);
          return res.ok ? undefined : false;
        } finally {
          setUploading(false);
        }
      },
    });
  }, [canUpload, doc, toast, applyUploaded]);

  const downloadOriginal = useCallback(async () => {
    if (!doc || !version) { toast('내려받을 문서·버전을 먼저 선택하세요'); return; }
    const res = await repo.downloadUploadFile({ docId: doc.docId, version, fileName: versionInfo?.fileName });
    toast(res.message);
  }, [doc, version, versionInfo, toast]);

  const print = useCallback(() => {
    if (!report) { toast('인쇄할 내용이 없습니다'); return; }
    printDocument({ nodeId: PRINT_NODE_ID, title: `${report.title || doc?.title || '업로드 리포트'} v${version}`, role });
  }, [report, doc, version, role, toast]);

  return {
    canUpload,
    uploading,
    docs,
    docsLoading: docsQuery.loading,
    docsError: docsQuery.error,
    docId,
    doc,
    docOptions: docs.map((d) => ({ value: d.docId, label: docOptionLabel(d) })),
    versions,
    versionsLoading: versionsQuery.loading,
    version,
    versionInfo,
    versionOptions: versions.map((v) => ({ value: Number(v.version), label: versionOptionLabel(v) })),
    report,
    reportLoading: !!dataKey && (dataQuery.loading || (!dataQuery.error && dataQuery.data?.key !== dataKey)),
    reportError: dataQuery.error,
    selectDoc,
    selectVersion,
    uploadNew,
    uploadVersion,
    downloadOriginal,
    print,
    reload: docsQuery.reload,
  };
}
