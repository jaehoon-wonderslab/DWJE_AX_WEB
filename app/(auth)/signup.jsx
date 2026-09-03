/**
 * 회원가입 (CM-03)  ·  경로 /signup
 */
import { useSignupController } from '@domains/auth/controller/useSignupController';
import SignupView from '@domains/auth/view/SignupView';

export default function SignupPage() {
  const controller = useSignupController();
  return <SignupView {...controller} />;
}
