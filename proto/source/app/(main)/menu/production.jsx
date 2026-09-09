/** 예전 허브 주소 — 생산·품질 그룹을 합친 뒤에는 새 허브로 보냅니다 (북마크 호환) */
import { Redirect } from 'expo-router';
export default function LegacyMenuRedirect() { return <Redirect href="/menu/operation" />; }
