/**
 * 비밀번호 찾기 (CM-03)  ·  경로 /forgot-password
 */
import { usePasswordResetController } from '@domains/auth/controller/usePasswordResetController';
import PasswordResetView from '@domains/auth/view/PasswordResetView';

export default function ForgotPasswordPage() {
  const controller = usePasswordResetController();
  return <PasswordResetView {...controller} />;
}
