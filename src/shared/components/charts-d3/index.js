/**
 * d3 차트 8종 (CM-06 · 웹 전용)
 *
 * export 이름은 charts/index.js 와 같습니다 — View 는 import 경로만 바꾸면 됩니다.
 * props 계약도 100% 동일합니다.
 *
 * app.json 에 ios·android 설정이 남아 있어 네이티브 번들에서 DOM 태그를 만나면 죽습니다.
 * 웹이 아니면 기존 charts/ 를 그대로 내보내 크래시를 막습니다.
 */
import { Platform } from 'react-native';

import * as native from '../charts';

import BarChartD3 from './BarChart';
import DonutChartD3 from './DonutChart';
import DotPlotD3 from './DotPlot';
import GaugeD3 from './Gauge';
import HBarChartD3 from './HBarChart';
import HeatMapD3 from './HeatMap';
import LineChartD3 from './LineChart';
import ParetoChartD3 from './ParetoChart';
import RadarChartD3 from './RadarChart';

const web = Platform.OS === 'web';

export const LineChart = web ? LineChartD3 : native.LineChart;
export const BarChart = web ? BarChartD3 : native.BarChart;
export const RadarChart = web ? RadarChartD3 : native.RadarChart;
export const HBarChart = web ? HBarChartD3 : native.HBarChart;
export const DotPlot = web ? DotPlotD3 : native.DotPlot;
export const HeatMap = web ? HeatMapD3 : native.HeatMap;
export const Gauge = web ? GaugeD3 : native.Gauge;
export const DonutChart = web ? DonutChartD3 : native.DonutChart;
export const ParetoChart = ParetoChartD3;

export { num, isNum, withValues, ChartEmpty } from '../charts/chartData';
