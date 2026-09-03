/**
 * 진입 경로 — 기본 화면으로 보냅니다.
 */
import { Redirect } from 'expo-router';
import { HOME_PATH } from '@shared/constants/menu';

export default function Index() {
  return <Redirect href={HOME_PATH} />;
}
