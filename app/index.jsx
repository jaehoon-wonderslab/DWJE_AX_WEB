/**
 * 진입 경로 — 기본 화면으로 보냅니다.
 *
 * 기본은 덕반장 AI 이고, 그 권한이 없는 부서는 첫 허용 화면입니다(homePathFor).
 */
import { Redirect } from 'expo-router';
import { homePathFor } from '@shared/navigation/routes';
import { useAuthStore } from '@shared/stores/useAuthStore';

export default function Index() {
  const can = useAuthStore((state) => state.can);
  return <Redirect href={homePathFor(can)} />;
}
