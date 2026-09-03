/**
 * [View] SY-11 AI 모델 버전 관리 (경로: /system/model-version)
 *
 * 서비스 버전(릴리스) = 벡터 인덱스 + 파인튜닝 체크포인트 조합입니다.
 * 사용 API 15건 — /api/v1/ai/model-releases/*, /ai/vector-builds, /ai/finetune-builds
 */
import React from 'react';
import { Text, View } from 'react-native';
import { LineChart } from '@shared/components/charts';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, EmptyState, KeyValue, Loading, Pagination, SourceNote, StatCard, Table, Tabs, XlsTable,
  openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';
import {
  EVAL_METRICS, buildStateLabel, buildStateTone, deployTone, durationText, isBuildDone, releaseTone,
} from '../controller/useModelVersionController';

/** 퍼센트 표기 — 값이 없으면 '—' */
const pct = (v) => (v === null || v === undefined || v === '' ? '—' : `${fixed(v)}%`);

/** 벡터 빌드의 대상 문서 — 서버는 `sources[]` 또는 비고(`remark`)로 줍니다 */
const sourcesText = (r) => {
  if (Array.isArray(r.sources) && r.sources.length) return r.sources.join(', ');
  return r.source || r.remark || '—';
};

export default function ModelVersionView({
  loading, tab, setTab, summary, releases, vectors, finetunes, trend, logs,
  loadApplyPreview, loadVectorBuild, loadFinetuneBuild,
  applyRelease, rollback, archive, createRelease, runVectorBuild, runFinetune, paging, itemsMeta,
  docTypes = [], embedOptions = [], baseOptions = [],
  stateLabel = (v) => v, deployLabel = (v) => v, distanceLabel = (v) => v, jobTypeLabel = (v) => v,
}) {
  const s = useCommonStyles();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  const numCell = (v) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{v}</Text>;

  /** 릴리스 등록 — 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍 */
  const openReleaseForm = () => {
    const vecs = vectors.filter((v) => isBuildDone(v.state));
    const fts = finetunes.filter((f) => isBuildDone(f.state));
    if (!vecs.length || !fts.length) {
      toast(`완료된 벡터 인덱스 ${vecs.length}개 · 체크포인트 ${fts.length}개 — 각각 1개 이상 있어야 릴리스를 등록할 수 있습니다`);
      return;
    }
    openFormModal({
      title: '릴리스 등록',
      sub: '시스템관리 > AI 모델 버전 관리',
      initial: { vecId: vecs[0].vecId, ftId: fts[0].ftId, applyNow: false },
      fields: [
        { key: 'ver', label: '버전', required: true, placeholder: '예) v1.5.0' },
        { key: 'vecId', label: '벡터 인덱스', type: 'select', required: true, options: vecs.map((v) => ({ value: v.vecId, label: `${v.vecId} · 문서 ${comma(v.docCnt ?? v.docs ?? 0)}건` })) },
        { key: 'ftId', label: '파인튜닝 체크포인트', type: 'select', required: true, options: fts.map((f) => ({ value: f.ftId, label: `${f.ftId} · 의도 ${pct((f.eval || f.evaluation)?.intent)}` })) },
        { key: 'applyNow', label: '등록 후 처리', type: 'radio', full: true, options: [{ value: false, label: '대기 상태로 등록' }, { value: true, label: '등록 후 바로 서비스 전환' }] },
        { key: 'note', label: '배포 메모', type: 'textarea', rows: 2, full: true, placeholder: '무엇이 달라졌는지 적어 두면 롤백 판단이 쉬워집니다' },
      ],
      note: '릴리스는 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍입니다. 둘 중 하나만 바꿔도 새 버전으로 등록해야 롤백이 가능합니다.',
      submitLabel: '등록',
      // 서버가 받는 항목은 ver · vecId · ftId · mode · note 입니다.
      // 폼의 applyNow 는 서버가 모르는 키라 빼고, '바로 전환' 이면 mode 만 붙입니다 (대기 등록은 mode 생략)
      onSubmit: async ({ applyNow, ...v }) => (await createRelease({ ...v, ...(applyNow ? { mode: '즉시 전환' } : {}) })).ok,
    });
  };

  /**
   * 서비스 전환 — 전환 전 성능 비교를 먼저 보여 줍니다.
   *
   * 응답은 { currentVer, targetVer, current{intent,cite,refuse,halluc}, target{…}, delta{…}, mustPassFail } 입니다.
   * 거절률·환각률은 낮을수록 좋으므로(lowerIsBetter) 변화 색을 반대로 칩니다.
   */
  const openApplyPreview = async (row) => {
    const p = await loadApplyPreview(row.ver);
    if (!p) {
      toast('성능 비교 정보를 불러오지 못했습니다');
      return;
    }
    const cur = p.current || {};
    const tgt = p.target || {};
    const currentVer = p.currentVer ?? cur.ver ?? null;
    const targetVer = p.targetVer ?? tgt.ver ?? row.ver;
    const rows = EVAL_METRICS
      .filter((m) => cur[m.key] != null || tgt[m.key] != null)
      .map((m) => {
        const before = cur[m.key];
        const after = tgt[m.key];
        const delta = before != null && after != null ? Number((after - before).toFixed(1)) : null;
        const good = delta == null ? null : m.lowerIsBetter ? delta < 0 : delta > 0;
        return {
          key: m.key,
          cells: [
            { v: `${m.label}${m.lowerIsBetter ? ' (낮을수록 좋음)' : ''}`, align: 'left' },
            { v: pct(before), num: true },
            { v: pct(after), num: true },
            { v: delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}%p`, num: true, tone: delta == null || delta === 0 ? undefined : good ? 'ok' : 'bad' },
          ],
        };
      });
    openModal({
      title: '서비스 버전 전환',
      sub: `${currentVer ?? '서비스 중 버전 없음'} → ${targetVer} · 자연어 질의가 새 버전으로 응답합니다`,
      render: () => (
        <View>
          {rows.length ? (
            <XlsTable
              columns={[
                { key: 'item', title: '항목', width: 220, align: 'left' },
                { key: 'before', title: `현재 ${currentVer ?? '—'}`, width: 120 },
                { key: 'after', title: `전환 ${targetVer}`, width: 120 },
                { key: 'diff', title: '변화', width: 110 },
              ]}
              rows={rows}
            />
          ) : (
            <EmptyState text="비교할 평가 지표가 없습니다. 서비스 중 버전이 없거나 두 버전의 평가가 아직 기록되지 않았습니다." />
          )}
          {p.mustPassFail ? (
            <SourceNote>{`필수 통과 항목 ${comma(p.mustPassFail)}건이 실패한 버전입니다. 전환 전에 평가 결과를 다시 확인하세요.`}</SourceNote>
          ) : null}
          <SourceNote>
            전환 즉시 신규 질의부터 새 버전이 적용됩니다. 진행 중인 대화는 영향받지 않으며, 전환 이력은 보안 감사 로그에 기록됩니다.
          </SourceNote>
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="취소" onPress={close} />
          <Button label="서비스 전환" variant="primary" onPress={() => { close(); applyRelease(row.ver, '즉시 전환'); }} />
        </>
      ),
    });
  };

  const confirmRollback = () =>
    openConfirmModal({
      title: '직전 버전 롤백',
      sub: summary?.servingVer ? `서비스 중 ${summary.servingVer}` : '서비스 중 버전 없음',
      message: '서비스 중인 버전을 직전 버전으로 되돌립니다. 신규 질의부터 즉시 적용되며, 되돌린 이력은 배포 이력과 보안 감사 로그에 기록됩니다.',
      confirmLabel: '롤백',
      danger: true,
      onConfirm: rollback,
    });

  /** 벡터 재색인 실행 — 실행 연동은 범위 밖, 폼과 서버 항목(sources · embedModelId · chunkSize)만 맞춰 둡니다 */
  const openVectorRun = () =>
    openFormModal({
      title: '벡터 재색인 실행',
      sub: '시스템관리 > AI 모델 버전 관리',
      initial: { sources: docTypes.map((d) => d.value), embedModelId: embedOptions[0]?.value, chunkSize: 512 },
      fields: [
        { key: 'sources', label: '대상 문서', type: 'check', full: true, options: docTypes },
        { key: 'embedModelId', label: '임베딩 모델', type: 'select', options: embedOptions },
        { key: 'chunkSize', label: '청크 크기', type: 'select', options: [{ value: 256, label: '256 토큰' }, { value: 512, label: '512 토큰' }, { value: 1024, label: '1024 토큰' }] },
      ],
      note: '전체 재색인은 40분 내외가 걸리며 진행 중에도 기존 인덱스로 서비스가 유지됩니다.',
      submitLabel: '실행',
      onSubmit: async (v) => (await runVectorBuild(v)).ok,
    });

  /** 파인튜닝 실행 — 실행 연동은 범위 밖, 폼과 서버 항목(baseModel · method · trainsetId · epoch)만 맞춰 둡니다 */
  const openFinetuneRun = () =>
    openFormModal({
      title: '파인튜닝 실행',
      sub: '시스템관리 > AI 모델 버전 관리',
      initial: { baseModel: baseOptions[0]?.value || '', method: 'LoRA', trainsetId: '', epoch: 3 },
      fields: [
        baseOptions.length
          ? { key: 'baseModel', label: '베이스 모델', type: 'select', options: baseOptions, required: true }
          : { key: 'baseModel', label: '베이스 모델', required: true, placeholder: '예) Qwen2.5-14B-Instruct', full: true },
        { key: 'method', label: '학습 방식', type: 'select', options: [{ value: 'LoRA', label: 'LoRA' }, { value: 'FULL', label: 'Full Fine-tuning' }] },
        { key: 'epoch', label: 'Epoch', type: 'number' },
        { key: 'trainsetId', label: '학습 데이터', full: true, placeholder: '내려받은 파일명 (예: trainset_20260902_0746)' },
      ],
      note: '학습 데이터는 질의 이력에서 내려받은 파일을 씁니다 (자연어 질의 이력 > 학습데이터 내보내기). r=64 이상은 GPU 메모리 초과(OOM)로 실패한 이력이 있습니다. 실행 전 VRAM 여유를 확인하세요.',
      submitLabel: '실행',
      onSubmit: async (v) => (await runFinetune(v)).ok,
    });

  /**
   * 빌드 상세
   *
   * 벡터 상세는 { vecId, config{type,embedModel,dim,distance}, stats{startedAt,duration,state,docCnt,chunkCnt,…}, remark, errors[] },
   * 파인튜닝 상세는 { config{}, eval{}, log } 형태입니다. 목록 행(row)의 값으로 빈 자리를 채웁니다.
   */
  const showBuild = async (kind, row) => {
    const id = kind === 'vec' ? row.vecId : row.ftId;
    const x = kind === 'vec' ? await loadVectorBuild(id) : await loadFinetuneBuild(id);
    if (!x) {
      toast('빌드 상세를 불러오지 못했습니다');
      return;
    }
    const st = x.stats || {};
    const cfg = x.config || {};
    const ev = x.eval || x.evaluation || row.eval || row.evaluation || {};
    const state = st.state ?? x.state ?? row.state;
    const failed = buildStateTone(state) === 'red';
    const logText = typeof x.log === 'string' ? x.log : '';
    const errors = Array.isArray(x.errors) ? x.errors : [];
    const oom = /oom|out of memory|memory/i.test(`${logText} ${errors.map((e) => e?.message || e).join(' ')}`);

    const rows =
      kind === 'vec'
        ? [
            ['빌드 ID', x.vecId || id],
            ['작업 종류', jobTypeLabel(cfg.type || row.type)],
            ['생성 시각', st.startedAt || row.startedAt || row.ts || '—'],
            ['소요 시간', durationText(st.duration ?? row.duration)],
            ['대상 문서', x.remark || sourcesText(row)],
            ['문서 수', `${comma(st.docCnt ?? row.docCnt ?? 0)} 건`],
            ['청크 수', st.chunkCnt ?? row.chunkCnt ? `${comma(st.chunkCnt ?? row.chunkCnt)} 개` : '—'],
            ['임베딩 모델', cfg.embedModel || row.embedModel || '—'],
            ['벡터 차원', cfg.dim ?? row.dim ? `${cfg.dim ?? row.dim} 차원` : '—'],
            ['거리 함수', distanceLabel(cfg.distance)],
            ['인덱스 크기', x.size ?? row.size ?? '—'],
            ['상태', <Badge key="st" tone={buildStateTone(state)}>{buildStateLabel(state)}</Badge>],
          ]
        : [
            ['빌드 ID', x.ftId || id],
            ['생성 시각', st.startedAt || row.startedAt || row.ts || '—'],
            ['소요 시간', durationText(st.duration ?? row.duration)],
            ['베이스 모델', cfg.baseModel || row.baseModel || '—'],
            ['학습 방식', cfg.method || row.method || '—'],
            ['학습 데이터', `${comma(cfg.samples ?? row.samples ?? 0)} 건`],
            ['Epoch', String(cfg.epoch ?? row.epoch ?? '—')],
            ['GPU 메모리', cfg.vram ?? row.vram ?? '—'],
            ['상태', <Badge key="st" tone={buildStateTone(state)}>{buildStateLabel(state)}</Badge>],
            ['의도 파악', pct(ev.intent)],
            ['근거 인용률', pct(ev.cite)],
            ['환각률', pct(ev.halluc)],
          ];

    openModal({
      title: kind === 'vec' ? '벡터 인덱스 상세' : '파인튜닝 체크포인트 상세',
      sub: id,
      render: () => (
        <View>
          <KeyValue keyWidth={120} rows={rows} />
          {failed ? (
            <SourceNote>
              {oom
                ? '실패 원인 — GPU 메모리 초과(OOM). LoRA rank 를 32 이하로 낮추거나 배치 크기를 줄인 뒤 다시 실행하세요.'
                : `실패 원인 — ${errors[0]?.message || errors[0] || logText || '기록된 오류 메시지가 없습니다. 서버 로그를 확인하세요.'}`}
            </SourceNote>
          ) : null}
          {!failed && errors.length ? <SourceNote>{`오류 ${comma(errors.length)}건 — ${errors[0]?.message || errors[0]}`}</SourceNote> : null}
          <SourceNote>{`서버 경로 /srv/ax/models/${id} · 온프레미스 보관`}</SourceNote>
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {isBuildDone(state) ? <Button label="이 빌드로 릴리스 등록" variant="primary" onPress={() => { close(); openReleaseForm(); }} /> : null}
        </>
      ),
    });
  };

  if (loading) return <Loading />;

  const ev = summary?.evaluation || {};
  const hasTrend = !!(trend?.labels?.length && trend?.series?.some((x) => (x.data || []).length));

  return (
    <View>
      <PageHead
        title="AI 모델 버전 관리"
        desc="서비스 버전(릴리스)은 벡터 인덱스와 파인튜닝 체크포인트 한 쌍입니다. 릴리스를 전환하면 자연어 질의가 그 버전으로 응답합니다."
        actions={
          <>
            <Button label="벡터 재색인" size="sm" icon="database" onPress={openVectorRun} />
            <Button label="파인튜닝 실행" size="sm" icon="play" onPress={openFinetuneRun} />
            <Button label="직전 버전 롤백" size="sm" icon="history" onPress={confirmRollback} />
            <Button label="릴리스 등록" size="sm" variant="primary" icon="plus" onPress={openReleaseForm} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard
          label="서비스 중 버전"
          value={summary?.servingVer ?? '—'}
          sub={summary?.servingSince ? `전환 ${summary.servingSince}` : `등록 릴리스 ${comma(summary?.releaseCnt ?? 0)}건 · 서비스 중 버전 없음`}
        />
        <StatCard
          label="의도 파악 정확도"
          value={pct(ev.intent)}
          sub={ev.cite != null ? `근거 인용률 ${pct(ev.cite)}` : '서비스 버전 평가 기록 없음'}
          tone={ev.intent != null ? 'up' : ''}
        />
        <StatCard label="환각률" value={pct(ev.halluc)} sub="낮을수록 좋음" tone={ev.halluc != null ? 'down' : ''} />
        <StatCard label="빌드 보유" value={`${comma(summary?.vectorCnt ?? 0)} / ${comma(summary?.finetuneCnt ?? 0)}`} sub="완료된 벡터 인덱스 / 체크포인트" />
      </Grid>
      <Gap />

      <Tabs items={['릴리스', '벡터 인덱스', '파인튜닝', '성능 추이']} value={tab} onChange={setTab} />

      {tab === '릴리스' ? (
        <Card title="릴리스" sub={`${comma(itemsMeta?.total ?? releases.length)}건 · 벡터 인덱스 + 파인튜닝 체크포인트 조합`} tight>
          <Table
            minWidth={1160}
            keyExtractor={(r) => r.ver}
            emptyText="등록된 릴리스가 없습니다. 완료된 벡터 인덱스와 체크포인트로 「릴리스 등록」을 진행하세요."
            columns={[
              { key: 'ver', title: '버전', width: 150, mono: true },
              { key: 'state', title: '상태', width: 100, render: (r) => <Badge tone={releaseTone(r.state)}>{stateLabel(r.state)}</Badge> },
              { key: 'vecId', title: '벡터 인덱스', width: 170, render: (r) => <Text style={[s.td, s.mono]} numberOfLines={1}>{r.vecNm || r.vecId || '—'}</Text> },
              { key: 'ftId', title: '체크포인트', width: 160, render: (r) => <Text style={[s.td, s.mono]} numberOfLines={1}>{r.ftId || '—'}</Text> },
              {
                key: 'registeredAt',
                title: '등록/전환 시각',
                width: 150,
                render: (r) => <Text style={[s.td, s.mono]}>{r.activatedAt || r.registeredAt || r.ts || '—'}</Text>,
              },
              { key: 'registeredBy', title: '수행자', width: 110, render: (r) => <Text style={s.td}>{r.registeredBy || r.by || '—'}</Text> },
              { key: 'note', title: '배포 메모', flex: 1, minWidth: 200, wrap: true, render: (r) => <Text style={s.td}>{r.note || r.description || r.name || '—'}</Text> },
              {
                key: 'action',
                title: '관리',
                width: 170,
                render: (r) => {
                  const serving = r.state === 'ACTIVE' || r.state === '서비스 중';
                  const archived = r.state === 'RETIRED' || r.state === '보관';
                  return (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Button label="전환" size="sm" variant={serving ? 'outline' : 'primary'} disabled={serving} onPress={() => openApplyPreview(r)} />
                      <Button label={archived ? '복원' : '보관'} size="sm" disabled={serving} onPress={() => archive(r.ver)} />
                    </View>
                  );
                },
              },
            ]}
            rows={releases}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        </Card>
      ) : null}

      {tab === '벡터 인덱스' ? (
        <Card title="벡터 인덱스" sub="문서 임베딩 빌드 이력 · 행을 누르면 상세를 봅니다" tight right={<Button label="재색인 실행" size="sm" icon="refresh" onPress={openVectorRun} />}>
          <Table
            minWidth={1120}
            keyExtractor={(r) => r.vecId}
            onRowPress={(r) => showBuild('vec', r)}
            emptyText="벡터 인덱스 빌드가 없습니다. 「재색인 실행」으로 첫 인덱스를 만드세요."
            columns={[
              { key: 'vecId', title: '빌드 ID', width: 170, mono: true },
              { key: 'type', title: '종류', width: 100, render: (r) => <Text style={s.td}>{jobTypeLabel(r.type)}</Text> },
              { key: 'startedAt', title: '생성 시각', width: 150, render: (r) => <Text style={[s.td, s.mono]}>{r.startedAt || r.ts || '—'}</Text> },
              { key: 'duration', title: '소요', width: 90, render: (r) => <Text style={s.td}>{durationText(r.duration)}</Text> },
              { key: 'sources', title: '대상 문서', flex: 1, minWidth: 240, wrap: true, render: (r) => <Text style={s.td}>{sourcesText(r)}</Text> },
              { key: 'docCnt', title: '문서 수', width: 90, align: 'right', render: (r) => numCell(comma(r.docCnt ?? r.docs ?? 0)) },
              { key: 'chunkCnt', title: '청크 수', width: 96, align: 'right', render: (r) => numCell(r.chunkCnt ?? r.chunks ? comma(r.chunkCnt ?? r.chunks) : '—') },
              { key: 'embedModel', title: '임베딩 모델', width: 170, render: (r) => <Text style={s.td} numberOfLines={1}>{r.embedModel || r.embedding || '—'}</Text> },
              { key: 'state', title: '상태', width: 90, render: (r) => <Badge tone={buildStateTone(r.state)}>{buildStateLabel(r.state)}</Badge> },
            ]}
            rows={vectors}
          />
        </Card>
      ) : null}

      {tab === '파인튜닝' ? (
        <Card title="파인튜닝 체크포인트" sub="학습 이력과 검증 결과 · 행을 누르면 상세를 봅니다" tight right={<Button label="파인튜닝 실행" size="sm" icon="play" onPress={openFinetuneRun} />}>
          <Table
            minWidth={1100}
            keyExtractor={(r) => r.ftId}
            onRowPress={(r) => showBuild('ft', r)}
            emptyText="파인튜닝 체크포인트가 없습니다. 「파인튜닝 실행」으로 첫 학습을 시작하세요."
            columns={[
              { key: 'ftId', title: '빌드 ID', width: 160, mono: true },
              { key: 'startedAt', title: '생성 시각', width: 150, render: (r) => <Text style={[s.td, s.mono]}>{r.startedAt || r.ts || '—'}</Text> },
              { key: 'duration', title: '소요', width: 100, render: (r) => <Text style={s.td}>{durationText(r.duration)}</Text> },
              { key: 'baseModel', title: '베이스 모델', width: 170, render: (r) => <Text style={s.td} numberOfLines={1}>{r.baseModel || r.base || '—'}</Text> },
              { key: 'method', title: '학습 방식', width: 140, render: (r) => <Text style={s.td}>{r.method || '—'}</Text> },
              { key: 'samples', title: '학습 데이터', width: 100, align: 'right', render: (r) => numCell(r.samples != null ? comma(r.samples) : '—') },
              { key: 'intent', title: '의도 파악', width: 90, align: 'right', render: (r) => numCell(pct((r.eval || r.evaluation)?.intent)) },
              { key: 'halluc', title: '환각률', width: 84, align: 'right', render: (r) => numCell(pct((r.eval || r.evaluation)?.halluc)) },
              { key: 'vram', title: 'GPU', width: 84, render: (r) => <Text style={s.td}>{r.vram ?? '—'}</Text> },
              { key: 'state', title: '상태', width: 90, render: (r) => <Badge tone={buildStateTone(r.state)}>{buildStateLabel(r.state)}</Badge> },
            ]}
            rows={finetunes}
          />
        </Card>
      ) : null}

      {tab === '성능 추이' ? (
        <Card title="버전별 성능 추이" sub="의도 파악 · 근거 인용률 · 환각률">
          {hasTrend ? (
            <LineChart labels={trend.labels} series={trend.series} min={0} max={100} unit="%" height={240} />
          ) : (
            <EmptyState text="성능 추이 데이터가 없습니다. 릴리스가 평가를 거쳐 전환되면 버전별 점수가 쌓입니다." />
          )}
          <SourceNote>환각률은 낮을수록 좋은 지표입니다. 전환 판단은 세 지표를 함께 보고 결정하세요.</SourceNote>
        </Card>
      ) : null}

      <Gap />

      <Card title="배포 · 학습 이력" sub="릴리스 등록 · 서비스 전환 · 롤백 · 색인 · 파인튜닝" tight>
        <Table
          minWidth={780}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          emptyText="배포·학습 이력이 없습니다."
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'type', title: '구분', width: 120, render: (r) => <Badge tone={deployTone(r.type ?? r.act)}>{deployLabel(r.type ?? r.act)}</Badge> },
            { key: 'detail', title: '내용', flex: 1, minWidth: 280, wrap: true },
            { key: 'by', title: '수행자', width: 160, render: (r) => <Text style={s.td}>{r.by ? `${r.by}${r.byDept ? ` (${r.byDept})` : ''}` : '—'}</Text> },
          ]}
          rows={logs}
        />
      </Card>
    </View>
  );
}
