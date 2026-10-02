/**
 * 초기 비밀번호 변경 (CM-03 · 기획 R-04)  ·  경로 /change-password
 *
 * 메뉴 화면이 아니라 인증 단계 화면입니다(화면 ID 없음). 들어올 수 있는 조건은 (auth)/_layout.jsx 가 정합니다.
 */
import { useChangePasswordController } from '@domains/auth/controller/useChangePasswordController';
import ChangePasswordView from '@domains/auth/view/ChangePasswordView';

export default function ChangePasswordPage() {
  const controller = useChangePasswordController();
  return <ChangePasswordView {...controller} />;
}
