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
import { Badge, Button, Card, KeyValue, Loading, Pagination, SourceNote, StatCard, Table, Tabs, XlsTable, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';

export default function ModelVersionView({
  loading, tab, setTab, summary, releases, vectors, finetunes, trend, logs,
  loadApplyPreview, loadVectorBuild, loadFinetuneBuild,
  applyRelease, rollback, archive, createRelease, runVectorBuild, runFinetune, paging, itemsMeta, docTypes = [], embedOptions = [], baseOptions = [],
}) {
  const s = useCommonStyles();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 릴리스 등록 — 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍 */
  const openReleaseForm = () => {
    const vecs = vectors.filter((v) => v.state === '완료');
    const fts = finetunes.filter((f) => f.state === '완료');
    if (!vecs.length || !fts.length) {
      toast('완료된 벡터 인덱스와 체크포인트가 각각 1개 이상 필요합니다');
      return;
    }
    openFormModal({
      title: '릴리스 등록',
      sub: '시스템관리 > AI 모델 버전 관리',
      initial: { vecId: vecs[0].vecId, ftId: fts[0].ftId, applyNow: false },
      fields: [
        { key: 'ver', label: '버전', required: true, placeholder: '예) v1.5.0' },
        { key: 'vecId', label: '벡터 인덱스', type: 'select', required: true, options: vecs.map((v) => ({ value: v.vecId, label: `${v.vecId} · 문서 ${comma(v.docs)}건` })) },
        { key: 'ftId', label: '파인튜닝 체크포인트', type: 'select', required: true, options: fts.map((f) => ({ value: f.ftId, label: `${f.ftId} · 의도 ${f.evaluation.intent}%` })) },
        { key: 'applyNow', label: '등록 후 처리', type: 'radio', full: true, options: [{ value: false, label: '대기 상태로 등록' }, { value: true, label: '등록 후 바로 서비스 전환' }] },
        { key: 'note', label: '배포 메모', type: 'textarea', rows: 2, full: true, placeholder: '무엇이 달라졌는지 적어 두면 롤백 판단이 쉬워집니다' },
      ],
      note: '릴리스는 벡터 인덱스 + 파인튜닝 체크포인트 한 쌍입니다. 둘 중 하나만 바꿔도 새 버전으로 등록해야 롤백이 가능합니다.',
      submitLabel: '등록',
      onSubmit: async (v) => (await createRelease(v)).ok,
    });
  };

  /** 서비스 전환 — 전환 전 성능 비교를 먼저 보여 줍니다 */
  const openApplyPreview = async (row) => {
    const p = await loadApplyPreview(row.ver);
    openModal({
      title: '서비스 버전 전환',
      sub: `${p.current.ver} → ${p.target.ver} · 자연어 질의가 새 버전으로 응답합니다`,
      render: () => (
        <View>
          <XlsTable
            columns={[
              { key: 'item', title: '항목', width: 200, align: 'left' },
              { key: 'before', title: `현재 ${p.current.ver}`, width: 120 },
              { key: 'after', title: `전환 ${p.target.ver}`, width: 120 },
              { key: 'diff', title: '변화', width: 110 },
            ]}
            rows={p.diff.map((d) => {
              const delta = Number((d.after - d.before).toFixed(1));
              const good = d.lowerIsBetter ? delta < 0 : delta > 0;
              return {
                key: d.label,
                cells: [
                  { v: d.label, align: 'left' },
                  { v: `${d.before}%`, num: true },
                  { v: `${d.after}%`, num: true },
                  { v: `${delta > 0 ? '+' : ''}${delta}%p`, num: true, tone: delta === 0 ? undefined : good ? 'ok' : 'bad' },
                ],
              };
            })}
          />
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
      message: '서비스 중인 버전을 직전 대기 버전으로 되돌립니다. 되돌린 이력은 감사 로그에 기록됩니다.',
      confirmLabel: '롤백',
      danger: true,
      onConfirm: rollback,
    });

  /** 벡터 재색인 실행 */
  const openVectorRun = () =>
    openFormModal({
      title: '벡터 재색인 실행',
      sub: '시스템관리 > AI 모델 버전 관리',
      // 서버가 받는 항목은 sources · embedModelId · chunkSize 입니다.
      // 예전엔 targets · embedding · chunk 로 보내서 무엇을 골라도 반영되지 않았습니다.
      // 임베딩 모델 목록 API 가 아직 없어 선택지는 서버에서 받아 채웁니다 (embedOptions).
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

  /** 파인튜닝 실행 */
  const openFinetuneRun = () =>
    openFormModal({
      title: '파인튜닝 실행',
      sub: '시스템관리 > AI 모델 버전 관리',
      // 서버가 받는 항목은 baseModel · method · trainsetId · epoch 입니다.
      // base · dataset · lr 로 보내던 것을 맞췄습니다 (학습률은 서버가 받지 않아 뺐습니다).
      // 학습 데이터셋은 서버에 레지스트리가 없습니다 — 내려받은 파일명을 그대로 씁니다
      // (POST /ai/chat/history/export-trainset 이 파일만 내려보내고 아무것도 저장하지 않습니다)
      initial: { baseModel: baseOptions[0]?.value || '', method: 'LoRA', trainsetId: '', epoch: 3 },
      fields: [
        baseOptions.length
          ? { key: 'baseModel', label: '베이스 모델', type: 'select', options: baseOptions, required: true }
          : { key: 'baseModel', label: '베이스 모델', required: true, placeholder: '예) Qwen2.5-14B-Instruct', full: true },
        { key: 'method', label: '학습 방식', type: 'select', options: [{ value: 'LoRA', label: 'LoRA' }, { value: 'FULL', label: 'Full Fine-tuning' }] },
        { key: 'epoch', label: 'Epoch', type: 'number' },
        { key: 'trainsetId', label: '학습 데이터', full: true, placeholder: '내려받은 파일명 (예: trainset_20260902_0746)' },
      ],
      note: '학습 데이터는 질의 이력에서 내려받은 파일을 씁니다 (자연어 질의 이력 > 학습데이터 내보내기). r=64 이상은 GPU 메모리 초과(OOM)로 실패한 이력이 있습니다.',
      submitLabel: '실행',
      onSubmit: async (v) => (await runFinetune(v)).ok,
    });

  /** 빌드 상세 */
  const showBuild = async (kind, id) => {
    const x = kind === 'vec' ? await loadVectorBuild(id) : await loadFinetuneBuild(id);
    if (!x) return;
    const rows =
      kind === 'vec'
        ? [
            ['빌드 ID', x.vecId], ['생성 시각', x.ts], ['소요 시간', x.duration], ['대상 문서', x.source],
            ['문서 수', `${comma(x.docs)} 건`], ['청크 수', x.chunks ? `${comma(x.chunks)} 개` : '—'],
            ['임베딩 모델', x.embedding], ['벡터 차원', `${x.dim} 차원`], ['인덱스 크기', x.size], ['상태', x.state],
          ]
        : [
            ['빌드 ID', x.ftId], ['생성 시각', x.ts], ['소요 시간', x.duration], ['베이스 모델', x.base],
            ['학습 방식', x.method], ['학습 데이터', `${comma(x.samples)} 건`], ['Epoch', String(x.epoch)],
            ['GPU 메모리', x.vram], ['상태', x.state],
            ['의도 파악', x.evaluation ? `${x.evaluation.intent}%` : '—'],
            ['근거 인용률', x.evaluation ? `${x.evaluation.cite}%` : '—'],
            ['환각률', x.evaluation ? `${x.evaluation.halluc}%` : '—'],
          ];
    openModal({
      title: kind === 'vec' ? '벡터 인덱스 상세' : '파인튜닝 체크포인트 상세',
      sub: id,
      render: () => (
        <View>
          <KeyValue keyWidth={120} rows={rows} />
          {x.state === '실패' ? (
            <SourceNote>실패 원인 — LoRA rank 64 · epoch 4 조합에서 GPU 메모리 초과(OOM). rank 를 32 이하로 낮추거나 배치 크기를 줄이세요.</SourceNote>
          ) : null}
          <SourceNote>{`서버 경로 /srv/ax/models/${id} · 온프레미스 보관`}</SourceNote>
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {x.state === '완료' ? <Button label="이 빌드로 릴리스 등록" variant="primary" onPress={() => { close(); openReleaseForm(); }} /> : null}
        </>
      ),
    });
  };

  if (loading) return <Loading />;

  const ev = summary?.evaluation || {};

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
        <StatCard label="서비스 중 버전" value={summary?.servingVer} sub={`전환 ${summary?.servingSince ?? '—'}`} />
        <StatCard label="의도 파악 정확도" value={ev.intent} unit="%" sub={`근거 인용률 ${ev.cite}%`} tone="up" />
        <StatCard label="환각률" value={ev.halluc} unit="%" sub="낮을수록 좋음" tone="up" />
        <StatCard label="빌드 보유" value={`${summary?.vectorCnt ?? 0} / ${summary?.finetuneCnt ?? 0}`} sub="벡터 인덱스 / 체크포인트" />
      </Grid>
      <Gap />

      <Tabs items={['릴리스', '벡터 인덱스', '파인튜닝', '성능 추이']} value={tab} onChange={setTab} />

      {tab === '릴리스' ? (
        <Card title="릴리스" sub="벡터 인덱스 + 파인튜닝 체크포인트 조합" tight>
          <Table
            minWidth={1060}
            keyExtractor={(r) => r.ver}
            columns={[
              { key: 'ver', title: '버전', width: 96, mono: true },
              { key: 'state', title: '상태', width: 100, render: (r) => <Badge tone={r.state === '서비스 중' ? 'green' : r.state === '보관' ? '' : 'blue'}>{r.state}</Badge> },
              { key: 'vecId', title: '벡터 인덱스', width: 170, mono: true },
              { key: 'ftId', title: '체크포인트', width: 160, mono: true },
              { key: 'ts', title: '등록/전환 시각', width: 150, mono: true },
              { key: 'by', title: '수행자', width: 150 },
              { key: 'note', title: '배포 메모', flex: 1, minWidth: 220, wrap: true },
              {
                key: 'action',
                title: '관리',
                width: 170,
                render: (r) => (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Button label="전환" size="sm" variant={r.state === '서비스 중' ? 'outline' : 'primary'} disabled={r.state === '서비스 중'} onPress={() => openApplyPreview(r)} />
                    <Button label={r.state === '보관' ? '복원' : '보관'} size="sm" onPress={() => archive(r.ver)} />
                  </View>
                ),
              },
            ]}
            rows={releases}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        </Card>
      ) : null}

      {tab === '벡터 인덱스' ? (
        <Card title="벡터 인덱스" sub="문서 임베딩 빌드 이력" tight right={<Button label="재색인 실행" size="sm" icon="refresh" onPress={openVectorRun} />}>
          <Table
            minWidth={1080}
            keyExtractor={(r) => r.vecId}
            onRowPress={(r) => showBuild('vec', r.vecId)}
            columns={[
              { key: 'vecId', title: '빌드 ID', width: 170, mono: true },
              { key: 'ts', title: '생성 시각', width: 150, mono: true },
              { key: 'duration', title: '소요', width: 90 },
              { key: 'source', title: '대상 문서', flex: 1, minWidth: 260, wrap: true },
              { key: 'docs', title: '문서 수', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{comma(r.docs)}</Text> },
              { key: 'chunks', title: '청크 수', width: 100, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.chunks ? comma(r.chunks) : '—'}</Text> },
              { key: 'size', title: '크기', width: 84, align: 'right' },
              { key: 'state', title: '상태', width: 90, render: (r) => <Badge tone={r.state === '완료' ? 'green' : r.state === '실패' ? 'red' : 'blue'}>{r.state}</Badge> },
            ]}
            rows={vectors}
          />
        </Card>
      ) : null}

      {tab === '파인튜닝' ? (
        <Card title="파인튜닝 체크포인트" sub="학습 이력과 검증 결과" tight right={<Button label="파인튜닝 실행" size="sm" icon="play" onPress={openFinetuneRun} />}>
          <Table
            minWidth={1100}
            keyExtractor={(r) => r.ftId}
            onRowPress={(r) => showBuild('ft', r.ftId)}
            columns={[
              { key: 'ftId', title: '빌드 ID', width: 160, mono: true },
              { key: 'ts', title: '생성 시각', width: 150, mono: true },
              { key: 'duration', title: '소요', width: 110 },
              { key: 'method', title: '학습 방식', width: 170 },
              { key: 'samples', title: '학습 데이터', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{comma(r.samples)}</Text> },
              { key: 'intent', title: '의도 파악', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.evaluation ? `${r.evaluation.intent}%` : '—'}</Text> },
              { key: 'halluc', title: '환각률', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.evaluation ? `${r.evaluation.halluc}%` : '—'}</Text> },
              { key: 'vram', title: 'GPU', width: 84 },
              { key: 'state', title: '상태', width: 90, render: (r) => <Badge tone={r.state === '완료' ? 'green' : 'red'}>{r.state}</Badge> },
            ]}
            rows={finetunes}
          />
        </Card>
      ) : null}

      {tab === '성능 추이' ? (
        <Card title="버전별 성능 추이" sub="의도 파악 · 근거 인용률 · 환각률">
          <LineChart labels={trend?.labels} series={trend?.series} min={0} max={100} unit="%" height={240} />
          <SourceNote>환각률은 낮을수록 좋은 지표입니다. 전환 판단은 세 지표를 함께 보고 결정하세요.</SourceNote>
        </Card>
      ) : null}

      <Gap />

      <Card title="배포 · 학습 이력" sub="릴리스 등록 · 서비스 전환 · 색인 · 파인튜닝" tight>
        <Table
          minWidth={780}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'act', title: '구분', width: 120, render: (r) => <Badge tone={r.act === '서비스 전환' ? 'green' : r.act === '롤백' ? 'amber' : ''}>{r.act}</Badge> },
            { key: 'detail', title: '내용', flex: 1, minWidth: 280, wrap: true },
            { key: 'by', title: '수행자', width: 160 },
          ]}
          rows={logs}
        />
      </Card>
    </View>
  );
}
