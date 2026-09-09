/**
 * 로그인 (CM-03)  ·  경로 /login
 */
import { useLoginController } from '@domains/auth/controller/useLoginController';
import LoginView from '@domains/auth/view/LoginView';

export default function LoginPage() {
  const controller = useLoginController();
  return <LoginView {...controller} />;
}
