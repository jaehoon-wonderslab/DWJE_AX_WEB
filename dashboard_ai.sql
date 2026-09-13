/*
AI 통합 대시보드 > MES 현황 — 전산 담당자 대조용 SELECT (2026-09-12)
대상 DB: API가 사용하는 PostgreSQL의 mes / ax 스키마. 원본 MSSQL용 문법이 아닙니다.
출처: API/src/main/kotlin/com/dwje/api/repository/DashboardAiRepository.kt,
      common/util/{DefectSql,SlotBucket}.kt, service/DashboardAiService.kt.

실행: 아래 3개 설정값을 화면 조회 조건에 맞춰 수정한 뒤 전체 스크립트 실행.
개별 SELECT 실행 시에도 먼저 BEGIN 및 SET LOCAL 3개를 같은 연결에서 실행하세요.
종료일은 화면과 같이 포함합니다. 실제 조건은 시작일 00:00 이상 / 종료일 다음날 00:00 미만.
SET LOCAL은 현재 트랜잭션의 조회 조건만 지정하며 테이블을 변경하지 않습니다.
사업장은 API app.defaultPlantCd(기본 PL01). 화면의 '1공장'은 사업장 코드와 동일하지 않습니다.
현재 대시보드 API는 기본 사업장을 사용하므로 공장명을 PL02 등으로 임의 치환하지 마세요.
샘플 날짜는 예시이며 실적 존재를 보장하지 않습니다. 화면에 적용된 날짜로 변경하세요.

대조 규칙:
- 생산량 = SUM(normal)+SUM(defect), 불량률 = 불량/생산*100, 수율 = 양품/생산*100.
- 화면의 수량/율 권한에 따른 비공개 및 표시 반올림은 SQL 이후 적용됩니다.
- 03의 ng_qty/total_qty*100이 시간대 불량률. ok_qty는 total_qty-ng_qty.
- 04는 defect_hist.ins_date와 원표 수량, 07은 label_hist.ins_date와 라벨 불량 안분값.
  두 카드의 유형별 합이 항상 같다고 가정하지 마세요. 05는 03과 같은 라벨 시각입니다.
- 07의 각 ng_qty를 API Rs.qty 규칙으로 정수 반올림하고, 08 총량에서 그 합을 뺀
  양수 잔여를 '유형 미상'으로 추가합니다. 화면은 양수 수량만 내림차순 정렬하고 누적 비중 계산.
- 06의 누계는 plan_qty/actual_qty 각각 합산. 계획 합이 0이면 화면은 계획/달성률을 표시하지 않음.
- 11~15는 loadAiDashboard에서 함께 조회하는 참고 데이터로, 모든 값이 독립 카드로 노출되지는 않음.
- AI 문장은 SELECT로 조회하는 저장 결과가 아닙니다. 아래 근거를 모아 모델 생성·검증 후 반환.
  문장 그대로의 재현은 briefing / cause-prescription API 응답과 함께 대조하세요.
*/
BEGIN READ ONLY;
SET LOCAL "dashboard_ai.plant" = 'PL01';
SET LOCAL "dashboard_ai.from" = '2026-09-01';
SET LOCAL "dashboard_ai.to" = '2026-09-07';

-- 01 총 생산 수량 · 평균 불량률 · 설비 가동률 / summary
-- Repository.findSummary
WITH prod AS (
    SELECT
        coalesce(sum(lh.normal), 0)                              AS ok_qty,
        coalesce(sum(lh.defect), 0)                              AS ng_qty,
        coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0) AS total_qty
    FROM mes.tb_pop_label_hist lh
    WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
      AND lh.del_flg   = 'N'
      AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
),
uptime AS (
    SELECT avg(mv.metric_value) AS uptime_rate
    FROM ax.tb_met_metric_value mv
    INNER JOIN ax.tb_met_metric_std ms ON ms.metric_id = mv.metric_id
    WHERE ms.metric_cd    = 'EQPT_UPTIME_RATE'
      AND mv.measured_at >= current_setting('dashboard_ai.from')::timestamp
      AND mv.measured_at <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
      AND (mv.plant_cd IS NULL OR mv.plant_cd = current_setting('dashboard_ai.plant'))
)
SELECT
    prod.ok_qty,
    prod.ng_qty,
    prod.total_qty,
    CASE WHEN prod.total_qty > 0
         THEN round(prod.ng_qty * 100.0 / prod.total_qty, 2)
         ELSE 0 END                       AS defect_rate,
    round(coalesce(uptime.uptime_rate, 0), 2) AS uptime_rate
FROM prod, uptime;

-- 02 경계 판정 대기 / summary.pendingBorderline
-- Repository.findPendingBorderline
SELECT
    count(*)                                                                  AS cnt,
    coalesce(max(extract(epoch FROM (now() - a.occurred_at)) / 60), 0)::int    AS max_wait_min
FROM ax.tb_alm_alert a
WHERE a.ack_state_cd = 'OPEN'
  AND a.occurred_at >= current_setting('dashboard_ai.from')::timestamp
  AND a.occurred_at <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
  AND (a.plant_cd IS NULL OR a.plant_cd = current_setting('dashboard_ai.plant'))
  AND a.title ILIKE '%경계%';

-- 03 시간대별 불량률 · 매트릭스 / defect-trend (분모·분자)
-- Repository.findDefectTrend
SELECT
    to_char((CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', lh.ins_date) - make_interval(hours => (extract(hour FROM lh.ins_date)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', lh.ins_date) ELSE date_trunc('week', lh.ins_date) END), CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 1 THEN 'HH24:MI' WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN 'MM-DD HH24시' ELSE 'MM-DD' END)                           AS slot,
    min(lh.ins_date)                                             AS slot_at,
    coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0)    AS total_qty,
    coalesce(sum(lh.defect), 0)                                  AS ng_qty
FROM mes.tb_pop_label_hist lh
WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
  AND lh.del_flg   = 'N'
  AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
GROUP BY 1 ORDER BY min(lh.ins_date);

-- 04 유형별 불량 수량 추이 / defect-trend (원표 시각·원표 수량)
-- Repository.findDefectTrendByType
WITH top_defects AS (
    SELECT dh.defect_cd
    FROM mes.tb_pop_defect_hist dh
    WHERE dh.plant_cd  = current_setting('dashboard_ai.plant')
      AND dh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND dh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp

      AND NOT EXISTS (SELECT 1 FROM ax.tb_sys_code nc WHERE nc.group_cd = 'QC_DEFECT_NONPROD' AND nc.use_flg = 'Y' AND nc.code = dh.defect_cd)
    GROUP BY dh.defect_cd
    ORDER BY sum(dh.qty) DESC
    LIMIT 2147483647
)
SELECT
    to_char((CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', dh.ins_date) - make_interval(hours => (extract(hour FROM dh.ins_date)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', dh.ins_date) ELSE date_trunc('week', dh.ins_date) END), CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 1 THEN 'HH24:MI' WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN 'MM-DD HH24시' ELSE 'MM-DD' END) AS slot,
    min(dh.ins_date)           AS slot_at,
    dh.defect_cd,
    max(md.defect_nm)          AS defect_nm,
    coalesce(sum(dh.qty), 0)   AS ng_qty
FROM mes.tb_pop_defect_hist dh
INNER JOIN top_defects td ON td.defect_cd = dh.defect_cd
LEFT  JOIN mes.tb_md_defect md
        ON md.plant_cd = dh.plant_cd AND md.defect_cd = dh.defect_cd
WHERE dh.plant_cd  = current_setting('dashboard_ai.plant')
  AND dh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND dh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp

  AND NOT EXISTS (SELECT 1 FROM ax.tb_sys_code nc WHERE nc.group_cd = 'QC_DEFECT_NONPROD' AND nc.use_flg = 'Y' AND nc.code = dh.defect_cd)
GROUP BY 1, dh.defect_cd
ORDER BY min(dh.ins_date), dh.defect_cd;

-- 05 유형별 추이의 유형 미상 / defect-trend
-- Repository.findUntypedDefectTrend
SELECT
    to_char((CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', lh.ins_date) - make_interval(hours => (extract(hour FROM lh.ins_date)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', lh.ins_date) ELSE date_trunc('week', lh.ins_date) END), CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 1 THEN 'HH24:MI' WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN 'MM-DD HH24시' ELSE 'MM-DD' END)   AS slot,
    min(lh.ins_date)                     AS slot_at,
    coalesce(sum(lh.defect), 0)          AS ng_qty
FROM mes.tb_pop_label_hist lh
WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
  AND lh.del_flg   = 'N'
  AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
  AND coalesce(lh.defect, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM mes.tb_pop_defect_hist dh
      WHERE dh.plant_cd  = lh.plant_cd
        AND dh.wc_cd     = lh.wc_cd
        AND dh.lot_no    = lh.lot_no
        AND dh.serial_no = lh.serial_no
        AND NOT EXISTS (SELECT 1 FROM ax.tb_sys_code nc WHERE nc.group_cd = 'QC_DEFECT_NONPROD' AND nc.use_flg = 'Y' AND nc.code = dh.defect_cd)
  )
GROUP BY 1 ORDER BY min(lh.ins_date);

-- 06 생산 계획 대비 실적 / plan-vs-actual
-- Repository.findPlanVsActual
WITH slots AS (
    SELECT generate_series(
        (CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', (current_setting('dashboard_ai.from')::timestamp)::timestamp) - make_interval(hours => (extract(hour FROM (current_setting('dashboard_ai.from')::timestamp)::timestamp)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', (current_setting('dashboard_ai.from')::timestamp)::timestamp) ELSE date_trunc('week', (current_setting('dashboard_ai.from')::timestamp)::timestamp) END),
        ((current_setting('dashboard_ai.to')::date + 1)::timestamp)::timestamp - (CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN make_interval(hours => 2) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN interval '1 day' ELSE interval '7 days' END),
        (CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN make_interval(hours => 2) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN interval '1 day' ELSE interval '7 days' END)
    ) AS slot_at
),
actual AS (
    SELECT
        (CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', lh.ins_date) - make_interval(hours => (extract(hour FROM lh.ins_date)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', lh.ins_date) ELSE date_trunc('week', lh.ins_date) END)                                                   AS slot_at,
        coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0)                          AS qty
    FROM mes.tb_pop_label_hist lh
    WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
      AND lh.del_flg   = 'N'
      AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
    GROUP BY 1
),
plan AS (
    SELECT
        (CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', sh.ins_date) - make_interval(hours => (extract(hour FROM sh.ins_date)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', sh.ins_date) ELSE date_trunc('week', sh.ins_date) END)                                                   AS slot_at,
        coalesce(sum(sh.qty), 0)                                                           AS qty
    FROM mes.tb_pop_stock_hist sh
    WHERE sh.plant_cd  = current_setting('dashboard_ai.plant')
      AND sh.hist_type = 'PLAN'
      AND sh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND sh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
    GROUP BY 1
)
SELECT
    to_char(s.slot_at, CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 1 THEN 'HH24:MI' WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN 'MM-DD HH24시' ELSE 'MM-DD' END) AS slot,
    coalesce(plan.qty, 0)           AS plan_qty,
    coalesce(actual.qty, 0)         AS actual_qty
FROM slots s
LEFT JOIN plan   ON plan.slot_at   = s.slot_at
LEFT JOIN actual ON actual.slot_at = s.slot_at
ORDER BY s.slot_at;

-- 07 불량 유형 구성 / defect-composition (반올림 전 안분값)
-- Repository.findDefectComposition
WITH
cur_label AS (
    SELECT lh.plant_cd, lh.wc_cd, lh.lot_no, lh.serial_no, lh.item_cd,
           coalesce(lh.defect, 0) AS ng_qty
    FROM mes.tb_pop_label_hist lh
    WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
      AND lh.del_flg   = 'N'
      AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp

),
cur_join AS (
    SELECT dh.defect_cd,
           l.ng_qty,
           sum(dh.qty)                                 AS type_qty,
           sum(sum(dh.qty)) OVER (
               PARTITION BY l.plant_cd, l.wc_cd, l.lot_no, l.serial_no
           )                                           AS label_type_total
    FROM cur_label l
    INNER JOIN mes.tb_pop_defect_hist dh
            ON dh.plant_cd  = l.plant_cd
           AND dh.wc_cd     = l.wc_cd
           AND dh.lot_no    = l.lot_no
           AND dh.serial_no = l.serial_no
           AND NOT EXISTS (SELECT 1 FROM ax.tb_sys_code nc WHERE nc.group_cd = 'QC_DEFECT_NONPROD' AND nc.use_flg = 'Y' AND nc.code = dh.defect_cd)
    WHERE l.ng_qty > 0
    GROUP BY l.plant_cd, l.wc_cd, l.lot_no, l.serial_no, l.ng_qty, dh.defect_cd
),
cur AS (
    SELECT defect_cd,
           coalesce(sum(ng_qty * type_qty / nullif(label_type_total, 0)), 0) AS ng_qty
    FROM cur_join
    GROUP BY defect_cd
)
SELECT
    cur.defect_cd,
    coalesce(md.defect_nm, cur.defect_cd) AS defect_nm,
    cur.ng_qty
FROM cur
LEFT JOIN mes.tb_md_defect md
       ON md.plant_cd = current_setting('dashboard_ai.plant') AND md.defect_cd = cur.defect_cd
ORDER BY cur.ng_qty DESC;

-- 08 불량 유형 구성의 원장 총량 / defect-composition.total
-- Repository.findDefectLedgerTotal
SELECT coalesce(sum(coalesce(lh.defect, 0)), 0) AS ng_qty
FROM mes.tb_pop_label_hist lh
WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
  AND lh.del_flg   = 'N'
  AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp;

-- 09 AI 브리핑·원인 분석의 설비별 근거 / line-production
-- Repository.findLineProduction
WITH prod AS (
    SELECT
        lh.eqpt_cd,
        lh.wc_cd,
        -- 설비 마스터의 model_nm 은 1,511대 전부 null 이라 쓸 수 없다.
        -- 실적의 품목을 제품 마스터로 옮겨 그 구간에 실제로 돌린 제품을 낸다.
        coalesce(p.model_cd, lh.item_cd)                          AS product,
        p.model_nm                                                AS product_nm,
        coalesce(sum(lh.normal), 0)                               AS ok_qty,
        coalesce(sum(lh.defect), 0)                               AS ng_qty,
        coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0) AS total_qty
    FROM mes.tb_pop_label_hist lh
    LEFT JOIN ax.tb_prod_item_map pm
           ON pm.plant_cd = lh.plant_cd AND pm.item_cd = lh.item_cd
    LEFT JOIN ax.tb_prod_product p ON p.product_id = pm.product_id
    WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
      AND lh.del_flg   = 'N'
      AND lh.eqpt_cd IS NOT NULL
      AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
      AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp

    GROUP BY lh.eqpt_cd, lh.wc_cd, coalesce(p.model_cd, lh.item_cd), p.model_nm
)
SELECT
    pr.eqpt_cd,
    max(e.eqpt_nm)          AS eqpt_nm,
    max(e.model_nm)         AS model_nm,
    max(w.wc_cd)            AS wc_cd,
    max(w.wc_nm)            AS wc_nm,
    sum(pr.ok_qty)          AS ok_qty,
    sum(pr.ng_qty)          AS ng_qty,
    sum(pr.total_qty)       AS total_qty,
    -- 가장 많이 만든 제품 하나와 나머지 종 수. 한 칸에 열 개를 늘어놓으면 못 읽는다.
    (array_agg(pr.product    ORDER BY pr.total_qty DESC))[1] AS top_product,
    (array_agg(pr.product_nm ORDER BY pr.total_qty DESC))[1] AS top_product_nm,
    count(DISTINCT pr.product) - 1                           AS product_etc_cnt
FROM prod pr
LEFT JOIN mes.tb_md_eqpt e
       ON e.plant_cd = current_setting('dashboard_ai.plant') AND e.eqpt_cd = pr.eqpt_cd
LEFT JOIN mes.tb_md_workcenter w
       ON w.plant_cd = current_setting('dashboard_ai.plant') AND w.wc_cd = pr.wc_cd
GROUP BY pr.eqpt_cd ORDER BY sum(pr.total_qty) DESC;

-- 10 AI 원인 분석의 공정별 근거 / process-yield
-- Repository.findProcessYield
SELECT
    lh.wc_cd,
    coalesce(max(w.wc_nm), lh.wc_cd)                          AS wc_nm,
    coalesce(sum(lh.normal), 0)                               AS ok_qty,
    coalesce(sum(lh.defect), 0)                               AS ng_qty,
    coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0) AS total_qty,
    max(w.sort_seq)                                           AS sort_seq
FROM mes.tb_pop_label_hist lh
LEFT JOIN mes.tb_md_workcenter w
       ON w.plant_cd = lh.plant_cd AND w.wc_cd = lh.wc_cd
WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
  AND lh.del_flg   = 'N'
  AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
GROUP BY lh.wc_cd
ORDER BY max(w.sort_seq) NULLS LAST, lh.wc_cd;

-- 11 추가 조회: 품질 지수 / quality-index
-- Repository.findQualityIndex
SELECT
    ms.metric_cd,
    ms.metric_nm,
    ms.std_val,
    ms.unit_cd,
    round(avg(mv.metric_value), 2) AS actual_val
FROM ax.tb_met_metric_std ms
LEFT JOIN ax.tb_met_metric_value mv
       ON mv.metric_id    = ms.metric_id
      AND mv.measured_at >= current_setting('dashboard_ai.from')::timestamp
      AND mv.measured_at <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
      AND (mv.plant_cd IS NULL OR mv.plant_cd = current_setting('dashboard_ai.plant'))
WHERE ms.metric_cd = ANY(ARRAY['PROD_OK_RATE','EQPT_UPTIME_RATE','PROD_ONTIME_RATE','AOI_ACCURACY_RATE','ALERT_RESPONSE_RATE','DATA_CONSISTENCY_RATE']::text[])
  AND ms.use_flg   = 'Y'
GROUP BY ms.metric_id, ms.metric_cd, ms.metric_nm, ms.std_val, ms.unit_cd
ORDER BY array_position(ARRAY['PROD_OK_RATE','EQPT_UPTIME_RATE','PROD_ONTIME_RATE','AOI_ACCURACY_RATE','ALERT_RESPONSE_RATE','DATA_CONSISTENCY_RATE']::text[], ms.metric_cd);

-- 12 추가 조회: 가동률 히트맵 / equipment-uptime-heatmap
-- Repository.findEquipmentUptimeHeatmap
SELECT
    mv.eqpt_cd,
    coalesce(max(e.eqpt_nm), mv.eqpt_cd) AS eqpt_nm,
    to_char((CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN date_trunc('hour', mv.measured_at) - make_interval(hours => (extract(hour FROM mv.measured_at)::int % 2)) WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 120 THEN date_trunc('day', mv.measured_at) ELSE date_trunc('week', mv.measured_at) END), CASE WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 1 THEN 'HH24:MI' WHEN (((current_setting('dashboard_ai.to')::date + 1)::timestamp)::date - (current_setting('dashboard_ai.from')::timestamp)::date) <= 7 THEN 'MM-DD HH24시' ELSE 'MM-DD' END) AS slot,
    min(mv.measured_at)                  AS slot_at,
    round(avg(mv.metric_value), 2)       AS uptime_rate
FROM ax.tb_met_metric_value mv
INNER JOIN ax.tb_met_metric_std ms ON ms.metric_id = mv.metric_id
LEFT  JOIN mes.tb_md_eqpt e
        ON e.plant_cd = current_setting('dashboard_ai.plant') AND e.eqpt_cd = mv.eqpt_cd
WHERE ms.metric_cd    = 'EQPT_UPTIME_RATE'
  AND mv.eqpt_cd     IS NOT NULL
  AND mv.measured_at >= current_setting('dashboard_ai.from')::timestamp
  AND mv.measured_at <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
  AND (mv.plant_cd IS NULL OR mv.plant_cd = current_setting('dashboard_ai.plant'))
GROUP BY mv.eqpt_cd, 3 ORDER BY mv.eqpt_cd, min(mv.measured_at);

-- 13 추가 조회: 최근 알림 / alerts (선택 기간 대신 최근 24시간)
-- Repository.findRecentAlerts
SELECT
    a.alert_id,
    a.severity_cd,
    a.title,
    a.evidence_desc,
    a.target_desc,
    a.eqpt_cd,
    a.occurred_at,
    a.ack_state_cd,
    extract(epoch FROM (now() - a.occurred_at)) / 60 AS elapsed_min,
    ag.agent_no,
    ag.agent_nm
FROM ax.tb_alm_alert a
LEFT JOIN ax.tb_ai_agent ag ON ag.agent_id = a.detect_agent_id
WHERE a.occurred_at >= now() - make_interval(hours => 24)
  AND (a.plant_cd IS NULL OR a.plant_cd = current_setting('dashboard_ai.plant'))
ORDER BY
    CASE a.severity_cd WHEN 'CRIT' THEN 1 WHEN 'WARN' THEN 2 ELSE 3 END,
    a.occurred_at DESC
LIMIT 20;

-- 14 추가 조회: Agent 현황 / agents
-- Repository.findAgentStatus
SELECT
    a.agent_id,
    a.agent_no,
    a.agent_nm,
    a.agent_desc,
    r.state_cd,
    r.run_at,
    r.throughput_txt,
    r.elapsed_ms,
    r.err_flg
FROM ax.tb_ai_agent a
LEFT JOIN LATERAL (
    SELECT ar.state_cd, ar.run_at, ar.throughput_txt, ar.elapsed_ms, ar.err_flg
    FROM ax.tb_ai_agent_run ar
    WHERE ar.agent_id = a.agent_id
    ORDER BY ar.run_at DESC
    LIMIT 1
) r ON true
WHERE a.use_flg = 'Y'
ORDER BY a.sort_seq;

-- 15 추가 조회: Master AI / agents.master (최근 10분)
-- Repository.findMasterState
SELECT
    count(*) FILTER (WHERE r.err_flg = 'Y')          AS err_cnt,
    count(*) FILTER (WHERE r.state_cd = 'RUNNING')   AS running_cnt,
    count(*)                                         AS total_cnt,
    round(avg(r.elapsed_ms))                         AS avg_elapsed_ms
FROM ax.tb_ai_agent_run r
WHERE r.run_at >= now() - interval '10 minutes';

-- 16 AI 일일 품질·생산 종합 브리핑의 계획 근거 / briefing
-- DayTargetRepository.findEffectiveTargets: 종료일에 유효한 제품×공정 최신 목표.
-- 이 행들의 target_qty 합이 AI planQty. 행이 없으면 null, 기간 일수를 곱하지 않습니다.
-- 06의 PLAN 전표와 다른 원천이므로 두 계획값의 차이를 전산 담당자와 확인하세요.
SELECT DISTINCT ON (product, wc_cd) product, wc_cd, target_qty, apply_from
FROM ax.tb_prod_day_target
WHERE plant_cd = current_setting('dashboard_ai.plant')
  AND apply_from <= current_setting('dashboard_ai.to')::date
ORDER BY product, wc_cd, apply_from DESC;

-- 17 AI 공정 원인 분석 대상 후보 / cause-prescription
-- DashboardAiService.findTargets: 생산량 하한 1,000, 불량률 3.5% 초과 (설정 기본값).
-- 운영 app.anomalyMinQty / ai.causeThreshold / ai.causeMaxTargets와 맞추세요.
-- 기준 초과 공정 중 불량률 내림차순 기본 5개가 분석 대상, 나머지는 omittedCnt.
-- 대상별 대표 설비는 09를 해당 공정(lh.wc_cd)으로 제한한 뒤 생산량 하한을 적용하고
-- 불량률 최대인 설비 선택. 처방 문서 검색은 의미 검색·권한·최신 여부 검증이 추가됩니다.
WITH process AS (
SELECT
    lh.wc_cd,
    coalesce(max(w.wc_nm), lh.wc_cd)                          AS wc_nm,
    coalesce(sum(lh.normal), 0)                               AS ok_qty,
    coalesce(sum(lh.defect), 0)                               AS ng_qty,
    coalesce(sum(lh.normal), 0) + coalesce(sum(lh.defect), 0) AS total_qty,
    max(w.sort_seq)                                           AS sort_seq
FROM mes.tb_pop_label_hist lh
LEFT JOIN mes.tb_md_workcenter w
       ON w.plant_cd = lh.plant_cd AND w.wc_cd = lh.wc_cd
WHERE lh.plant_cd  = current_setting('dashboard_ai.plant')
  AND lh.del_flg   = 'N'
  AND lh.ins_date >= current_setting('dashboard_ai.from')::timestamp
  AND lh.ins_date <  (current_setting('dashboard_ai.to')::date + 1)::timestamp
GROUP BY lh.wc_cd
ORDER BY max(w.sort_seq) NULLS LAST, lh.wc_cd
), candidates AS (
 SELECT *, round(ng_qty * 100.0 / nullif(total_qty,0), 2) AS defect_rate
 FROM process WHERE total_qty >= 1000
)
SELECT *, row_number() OVER (ORDER BY defect_rate DESC) AS candidate_rank,
       row_number() OVER (ORDER BY defect_rate DESC) <= 5 AS within_default_limit
FROM candidates WHERE defect_rate > 3.5
ORDER BY defect_rate DESC;

-- AI briefing 추가 근거: 01의 생산·불량·수율, 07 상위 유형(서버 DEFECT_TOP_N),
-- 09의 최소 생산량 이상 설비 중 불량률 상위 이상 후보를 사용합니다.
ROLLBACK;
